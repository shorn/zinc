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
import { getBearerToken } from "Util/Header";

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
  
  authorize: {
    post: async (req) => authorizeUser(req, await config),
  },
  
  // authorized calls
  listUsers: {
    post: async (req, token) => listPublicUserData(req, await config, token),
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
  const emailUserPoolId = readStringParam(
    process.env.COGNITO_EMAIL_USER_POOL_ID_SSM_PARAM);
  const emailClientId = readStringParam(
    process.env.COGNITO_EMAIL_USER_POOL_CLIENT_ID_SSM_PARAM);
  
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
      email: {
        userPoolId: await emailUserPoolId,
        userPoolClientId: await emailClientId,
      },
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
  } 
  catch( err ){
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

/** Does JSON parsing, validates the type param is a valid API Call.
 * <p>
 * Could also use a proper framework/middleware but I've already spent way too
 * much time shaving yaks on this project. 
 */
function parseApiPostCall(event: APIGatewayProxyEvent): { 
  type: keyof ApiMap,
  body: Record<string, any>,
  accessToken?: string;
} {
  if( !event.body ){
    throw new Error("no event body");
  }
  
  console.log("event", event);
  
  if( !event.queryStringParameters ){
    throw new Error("no query string");
  }
  const type = event.queryStringParameters["type"];
  if( !isApiKey(type) ){
    console.error("query `type` parameter does not map", type, event);
    throw new Error("query `type` parameter does not map: " + type);
  }
  
  // TODO:STO needs to deal with dates like frontend, just don't have any
  // date request params, yet.
  const body: Record<string, any> = JSON.parse(event.body);

  let accessToken = getBearerToken(event);
  
  /* note that there is no runtime validation of the the request, so WHEN 
   I stuff up version syncing, it's going to be a pain to diagnose :( */
  return {
    type, body, accessToken
  };
}

function isApiKey(key: string|undefined): key is keyof ApiMap {
  if( !key ){
    return false;
  }
  let validApiCalls = Object.keys(api);
  return validApiCalls.includes(key);
}

async function dispatchApiCall(event: APIGatewayProxyEvent){
  if( event.httpMethod !== "POST"){
    throw new Error("this api only supports POST at the moment");
  }

  const apiCall = parseApiPostCall(event);
  console.log("apiCall", apiCall);
  
  const call = api[apiCall.type].post as Function;

  return await call(apiCall.body, apiCall.accessToken);
}


export interface ServerAuthzContainer {
  access: AuthzTokenPayload,
  user: User,
}





