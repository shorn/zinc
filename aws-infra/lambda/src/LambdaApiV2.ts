import { APIGatewayProxyHandler } from "aws-lambda";
import { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy";
import { JwtRsaVerifier } from "aws-jwt-verify";
import {
  ApiMap,
  AuthzTokenPayload,
  CognitoConfig,
  User
} from "shared/ApiTypes";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";
import { AuthError, forceError } from "Util/Error";
import { readStringListParam, readStringParam } from "Util/Ssm";
import { authorizeUser } from "Api/AuthorizeUser";
import { listPublicUserData } from "Api/ListUsers";
import { UserTableV1Db } from "Db/UserTableV1Db";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { tableName } from "../../src/Stack/OneTableStackV1";

const name = "LambdaApiV2";
const lambdaCreateDate = new Date();

let config: Promise<LambaApiV2Config> = initConfig();

export const api: ApiMap = {
  // unauthorized calls
  readConfig: {
    post: async () => ({
      cognito: (await config).cognito,
      lambdaCreateDate: lambdaCreateDate.toISOString() as unknown as Date,  
    }),
  },
  
  /** Was useful when I was restricting to a single instance.
   * Pretty useless for normal lambdas.
   * Generally you'd use an AWS mechanism to achieve this (new version,
   * throttle, etc.)
   */
  initConfig: {
    post: async () => {
      config = initConfig(true);
      return (await config).cognito;
    },
  },

  authorize: {
    post: async req => authorizeUser(req, await config),
  },
  
  // authorized calls
  listUsers: {
    post: async req => listPublicUserData(req, await config),
  },
}

export interface LambaApiV2Config {
  cognito: CognitoConfig,
  verifier: {
    google: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
  },
  authzSecrets: string[],
  database: UserTableV1Db,
}

export interface CognitoVerifierProps {
  issuer: string,
  audience: string,
  jwksUri: string,
}

async function initConfig(reload = false): Promise<LambaApiV2Config>{
  if( !reload && config ){
    return config;
  }

  const cognitoRegion = readStringParam(
    process.env.COGNITO_REGION_SSM_PARAM);
  const googleUserPoolId = readStringParam(
    process.env.COGNITO_GOOGLE_USER_POOL_ID_SSM_PARAM);
  const googleUserPoolDomain = readStringParam(
    process.env.COGNITO_GOOGLE_USER_POOL_DOMAIN_SSM_PARAM);
  const googleClientId = readStringParam(
    process.env.COGNITO_GOOGLE_USER_POOL_CLIENT_ID_SSM_PARAM);
  const authzSecretsSsmParam = readStringListParam(process.env.AUTHZ_SECRETS_SSM_PARAM);

  const idpUrl: string = `https://cognito-idp.` +
    `${await cognitoRegion}.amazonaws.com/` +
    `${await googleUserPoolId}`;

  const googleVerifier = JwtRsaVerifier.create({
    issuer: idpUrl,
    audience: await googleClientId,
    jwksUri: `${idpUrl}/.well-known/jwks.json`,
  });
  console.log("google verifier created", idpUrl);

  return {
    cognito: {
      region: await cognitoRegion,
      google: {
        userPoolId: await googleUserPoolId,
        userPoolClientId: await googleClientId,
        userPoolDomain: await googleUserPoolDomain,
      }
    },
    verifier: {
      google: googleVerifier,
    },
    authzSecrets: await authzSecretsSsmParam,
    database: new UserTableV1Db(new DynamoDB({}), tableName),
  }
}

// Likely will have to change when moved over to function urls.
export const handler: APIGatewayProxyHandler = async (event, context)=> {
  console.log(name + " exec");

  try {
    const res = await dispatchApiCall(event);

    return {statusCode: 200, body: JSON.stringify(res, null, 4)};

  } catch( err ){
    if( err instanceof AuthError ){
      console.error("auth error", err.message, err.privateMsg);
      return {
        statusCode: 400,
        body: err.message,
      };
    }
    console.error("error", err);
    return {statusCode: 500, body: forceError(err).message};
  }
};

/** Does JSON parsing, validates the body.type field is a valid API Call.
 * Reckon this would be better if we actually use the request param for 
 * type and let the entire body map directly to the request. 
 * Clean and symmetrical.
 * <p>
 * Also, the accessToken should go in the `authorization` header, not be 
 * part of the request (too easy to leak via logs and other bad tooling) - 
 * everyone knows they should be careful of the auth header.
 * The current state is because I haven't configred the api-gw properly to pass
 * params etc.
 * <p>
 * Could also use a proper framework/middleware but I've already spent way too
 * much time shaving yaks on this project. 
 */
function parseApiPostCall(event: APIGatewayProxyEvent)
: object & { type: keyof ApiMap} {
  if( !event.body ){
    throw new Error("no event body");
  }
  
  console.log("event", event);
  
  // TODO:STO needs to deal with dates like frontend, just don't have any
  // date request params, yet.
  const body: any = JSON.parse(event.body);

  if( !body.type ){
    throw new Error("request body has no [type] field");
  }

  /* note that there is no runtime validation of the the request, so WHEN 
   I stuff up version syncing, it's going to be a pain to diagnose :( */

  let validApiCalls = Object.keys(api);
  if( !(validApiCalls.includes(body.type)) ){
    console.error("unknown ApiCall.type", body.type, event)
    throw new Error("unknown ApiCall.type="+body.type);
  }

  return body;
}

async function dispatchApiCall(event: APIGatewayProxyEvent){
  if( event.httpMethod !== "POST"){
    throw new Error("this api only supports POST at the moment");
  }

  const apiCall = parseApiPostCall(event);
  console.log("apiCall", apiCall);
  
  const call = api[apiCall.type].post;
  
  return await call(apiCall as any);
}


export interface ServerAuthzContainer {
  access: AuthzTokenPayload,
  user: User,
}





