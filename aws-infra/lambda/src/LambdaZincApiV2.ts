import { Handler } from "aws-lambda";
import { JwtRsaVerifier } from "aws-jwt-verify";
import {
  AuthApi,
  AuthorizedPost,
  CognitoConfig,
  PostApi,
} from "shared/ApiTypes";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";
import { AuthError, forceError } from "Util/Error";
import { readStringListParam, readStringParam } from "Util/Ssm";
import { listPublicUserData, readUser, updateUser } from "ZincApi/User";
import { UserTableV1Db } from "Db/UserTableV1Db";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { tableName } from "../../src/Stack/OneTableStackV1";
import { getBearerToken } from "Util/Header";
import { GENERIC_DENIAL, getAuthzSigningSecret } from "ZincApi/Authz/GuardAuthz";
import {
  formatErrorResponse,
  formatSuccessResponse,
  LambdaEventHeaders,
  LambdaFunctionUrlEvent, LambdaResponse
} from "Util/LambdaEvent";
import { prdApiPath } from "../../src/Stack/CloudFrontStackV5";
import { authorizeUser } from "ZincApi/AuthorizeUser";
import { formatCognitoIdpUrl } from "Util/Cognito";

const name = "LambdaApiV2";
const lambdaCreateDate = new Date();


export const authApi: AuthApi = {
  readConfig: async () => ({
    cognito: (await config).cognito,
    lambdaCreateDate: lambdaCreateDate.toISOString() as unknown as Date,
  }),

  authorize: async (token) => authorizeUser(token, await config),
}

const postApi: PostApi = {
  // again, now that these are so consistent, could be done dynamically
  listUser: async (req, token) => listPublicUserData(req, await config, token!),
  readUser: async (req, token) => readUser(req, await config, token!),
  updateUser: async (req, token) => updateUser(req, await config, token!),
}

// time spent in here is part of the "cold start" 
let config: Promise<LambaApiV2Config> = initConfig();
export interface LambaApiV2Config {
  cognito: CognitoConfig,
  verifier: {
    // "MultiIssuer" might be better, but this seems simpler right now
    google: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
    email: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
    github: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
  },
  authzSecrets: string[],
  authzSigningSecret: string,
  database: UserTableV1Db,
  apiPathPrefix: string,
}

export interface CognitoVerifierProps {
  issuer: string,
  audience: string,
  jwksUri: string,
}

// bump lambda to force re-reading config
async function initConfig(): Promise<LambaApiV2Config>{
  if( config ){
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

  const githubUserPoolDomain = readStringParam(
    process.env.COGNITO_GITHUB_USER_POOL_DOMAIN_SSM_PARAM);
  const githubUserPoolId = readStringParam(
    process.env.COGNITO_GITHUB_USER_POOL_ID_SSM_PARAM);
  const githubClientId = readStringParam(
    process.env.COGNITO_GITHUB_USER_POOL_CLIENT_ID_SSM_PARAM);
  
  const authzSecretsSsmParam = readStringListParam(
    process.env.AUTHZ_SECRETS_SSM_PARAM );

  const googleIdpUrl: string = formatCognitoIdpUrl({
    region: await cognitoRegion, 
    userPoolId: await googleUserPoolId });
  const emailIdpUrl: string = formatCognitoIdpUrl({
    region: await cognitoRegion, 
    userPoolId: await emailUserPoolId });
  const githubIdpUrl: string = formatCognitoIdpUrl({
    region: await cognitoRegion, 
    userPoolId: await githubUserPoolId });

  const googleVerifier = JwtRsaVerifier.create({
    issuer: googleIdpUrl,
    audience: await googleClientId,
    jwksUri: `${googleIdpUrl}/.well-known/jwks.json`,
  });

  const emailVerifier = JwtRsaVerifier.create({
    issuer: emailIdpUrl,
    audience: await emailClientId,
    jwksUri: `${emailIdpUrl}/.well-known/jwks.json`,
  });

  const githubVerifier = JwtRsaVerifier.create({
    issuer: githubIdpUrl,
    audience: await githubClientId,
    jwksUri: `${githubIdpUrl}/.well-known/jwks.json`,
  });

  console.log("idToken verifiers created");

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
      },
      github: {
        userPoolId: await githubUserPoolId,
        userPoolClientId: await githubClientId,
        userPoolDomain: await githubUserPoolDomain,
      },
    },
    verifier: {
      google: googleVerifier,
      email: emailVerifier,
      github: githubVerifier
      //githubClientSecret, 
    },
    authzSecrets: await authzSecretsSsmParam,
    // didn't want to run the checks on each invocation, so do it here
    authzSigningSecret: getAuthzSigningSecret(await authzSecretsSsmParam),
    database: new UserTableV1Db(new DynamoDB({}), tableName),
    // IMPROVE: probably should come from params instead of binding statically 
    apiPathPrefix: `/${prdApiPath}/`,
  }
}


export const handler: Handler<LambdaFunctionUrlEvent, LambdaResponse> = 
  async (event, context)=> 
{
  console.log(name + " exec");

  try {
    
    const authApiResult = await dispatchAuthApiCall(await config, event);
    if( authApiResult ){
      return formatSuccessResponse(authApiResult);
    }
    
    const postApiResult = await dispatchPostCall(await config, event);
    if( postApiResult ){
      return formatSuccessResponse(postApiResult);
    }

    console.error("failed to dispatch", event);
    return formatErrorResponse(404, "invalid API call");
    
  } 
  catch( err ){
    if( err instanceof AuthError ){
      console.error("auth error", err.message, err.privateMsg);
      return formatErrorResponse(400, err.message);
    }
    console.error("error", err);
    return formatErrorResponse(500, forceError(err).message);
  }
};

async function dispatchAuthApiCall(
  config: LambaApiV2Config,
  event: LambdaFunctionUrlEvent
):Promise<undefined | object>{
  const {method} = event.requestContext.http; 
  if( method !== "GET"){
    return undefined;
  }

  console.log("get event", event);
  
  const apiName = parseApiName(config, event);

  if( apiName  === "readConfig" ){
    return await authApi.readConfig();
  }                 
  else if( apiName === "authorize" ){
    let idToken = getBearerToken(event.headers);
    if( !idToken ){
      throw new AuthError({publicMsg:GENERIC_DENIAL, 
        privateMsg: "no idToken in headers" });
    }
    return await authApi.authorize(idToken);
  }
  else {
    return undefined;
  }
}

async function dispatchPostCall(
  config: LambaApiV2Config,
  event: LambdaFunctionUrlEvent
): Promise<undefined|object>{
  const {method} = event.requestContext.http;
  if( method !== "POST"){
    return undefined
  }

  if( !event.body ){
    console.warn("POST method with no body");
    return undefined;
  }

  console.log("post event", event);

  const apiName = parseApiName(config, event);
  if( !apiName ){
    // couldn't parse out a name from the path
    return undefined;
  }

  const apiCall = parseApiPostCall(apiName, event.headers, event.body);
  console.log("apiCall", apiCall);
  
  if( !apiCall ){
    // couldn't match the path name to a valid API name
    return undefined;
  }

  const call = postApi[apiCall.name] as AuthorizedPost<any, any>;

  return await call(apiCall.body, apiCall.authToken);
}

/** Does JSON parsing, validates the name param is a valid API Call.
 * <p>
 * Could also use a proper framework/middleware but I've already spent way too
 * much time shaving yaks on this project.
 */
function parseApiPostCall(
  apiName: string,
  headers: LambdaEventHeaders,
  requestBody: string,
): undefined | {
  name: keyof PostApi,
  body: Record<string, any>,
  authToken?: string;
}{
  if( !isPostApiKey(apiName) ){
    return undefined;
  }

  // IMPROVE: needs to deal with dates like frontend, just don't have any
  // date request params, yet.
  const body: Record<string, any> = JSON.parse(requestBody);

  let authToken = getBearerToken(headers);

  /* note that there is no runtime validation of the the request, so WHEN 
   I stuff up version syncing, it's going to be a pain to diagnose :( */
  return {
    name: apiName, body, authToken
  };
}

function isPostApiKey(key: string|undefined): key is keyof PostApi {
  if( !key ){
    return false;
  }
  let validApiCalls = Object.keys(postApi);
  return validApiCalls.includes(key);
}

function parseApiName(
  config: LambaApiV2Config,
  event: LambdaFunctionUrlEvent
): string|undefined{
  let {path} = event.requestContext.http;

  // slice off the api prefix
  if( !path.startsWith(config.apiPathPrefix) ){
    return undefined;
  }
  path = path.slice(config.apiPathPrefix.length);

  // slice off any trailing slash
  if( path.endsWith("/") ){
    path = path.slice(0, -1);
  }

  // handle empty edge case explicitly
  path = path.trim();
  if( path === "" ){
    return undefined;
  }

  return path;
}



