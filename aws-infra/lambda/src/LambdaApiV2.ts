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

const name = "LambdaApiV2";


export const api: ApiMap = {
  authorize: {
    post: async req => authorizeUser(req, await config),
  },
  readConfig: {
    post: async () => (await config).cognito,
  },
  initConfig: {
    post: async () => {
      config = initConfig(true);
      return (await config).cognito;
    },
  },
  listUsers: {
    post: async req => listPublicUserData(req, await config),
  },
}


export interface AuthUserConfig {
  cognito: CognitoConfig,
  verifier: {
    google: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
    //aauthorization: JwtRsaVerifierSingleIssuer<AuthzVerifierProps>,
  },
  authzSecrets: string[],
}

export interface CognitoVerifierProps {
  issuer: string,
  audience: string,
  jwksUri: string,
}

async function initConfig(reload = false): Promise<AuthUserConfig>{
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
  }

}

// executes at lambda init-time
let config: Promise<AuthUserConfig> = initConfig();

export const handler: APIGatewayProxyHandler = async (
  event, context
)=> {
  //console.log(name+" exec", event, context);
  console.log(name + " exec");

  try {
    //const req = parseApiRequest(event);
    //const res = await dispatchRequest(req);
    
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
 */
function parseApiCallType(event: APIGatewayProxyEvent)
: object & { type: keyof ApiMap} {
  if( !event.body ){
    throw new Error("no event body");
  }
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

  const apiCall = parseApiCallType(event);
  console.log("apiCall", apiCall);
  
  const call = api[apiCall.type].post;
  
  return await call(apiCall as any);
}


export interface ServerAuthzContainer {
  access: AuthzTokenPayload,
  user: User,
}





