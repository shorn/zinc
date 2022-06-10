import { Handler } from "aws-lambda";
import { JwtRsaVerifier } from "aws-jwt-verify";
import {
  AuthApi,
  AuthorizedPost,
  CognitoConfig,
  PostApi,
} from "Shared/ApiTypes";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";
import { AuthError, forceError, isError } from "Util/Error";
import { listPublicUserData, readUser, updateUser } from "ZincApi/User";
import { UserTableV1Db } from "Db/UserTableV1Db";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { tableName } from "../../../src/Stack/OneTableStackV1";
import { getBearerToken } from "Util/Header";
import {
  GENERIC_DENIAL,
  getAuthzSigningSecret
} from "ZincApi/Authz/GuardAuthz";
import {
  DANGERouslyLogEvent,
  formatErrorResponse,
  formatSuccessResponse,
  LambdaEventHeaders,
  LambdaFunctionUrlEvent,
  LambdaResponse
} from "Util/LambdaEvent";
import { prdApiPath } from "../../../src/Stack/CloudFrontStackV5";
import { authorizeUser } from "ZincApi/AuthorizeUser";
import {
  createCognitoJwtRsaVerifier,
  readZincApiConfigFromSsm,
  ZincApiConfig
} from "ZincApi/ZincApiConfig";
import {
  aaf,
  facebookIssuerUrl, facebookJwksUrl,
  googleIssuerUrl,
  googleJwksUrl
} from "Shared/Constant";
import {
  DirectTwitterAuthnConfig,
  OAuthClientConfig,
  readOAuthConfigFromSsm, readTwitterConfigFromSsm
} from "LambdaConfig";

const name = "ZincApi";
const lambdaCreateDate = new Date();

export const authApi: AuthApi = {
  readConfig: async () => ({
    cognito: (await runtime).cognito,
    directAuthn: {
      github: {
        clientId: (await runtime).directAuthn.github.clientId,
      },
      google: {
        issuer: (await runtime).directAuthn.google.functionUrl,
        clientId: (await runtime).directAuthn.google.clientId,
      },
      facebook: {
        issuer: (await runtime).directAuthn.facebook.functionUrl,
        clientId: (await runtime).directAuthn.facebook.clientId,
      },
      twitter: {
        issuer: (await runtime).directAuthn.twitter.functionUrl,
      },
      aaf: {
        issuer: (await runtime).directAuthn.aaf.functionUrl,
        clientId: (await runtime).directAuthn.aaf.clientId,
      },
    },
    lambdaCreateDate: lambdaCreateDate.toISOString() as unknown as Date,
  }),

  authorize: async (token) => authorizeUser(token, await runtime),
}

const postApi: PostApi = {
  // again, now that these are so consistent, could be done dynamically
  listUser: async (req, token) => listPublicUserData(req, await runtime, token!),
  readUser: async (req, token) => readUser(req, await runtime, token!),
  updateUser: async (req, token) => updateUser(req, await runtime, token!),
}

/* I can't think of the right name, so I'm using "Runtime" for the moment.
It's all the stuff that the lambda needs at runtime to do it's work.
It's mostly driven by the config but also anything we can "pre-calculate" 
at warm-up time instead of executing it at actual Lambda runtime (which costs
money).
For example, we can validate and select a single secret we want to use for
signing tokens from the `authzSecrets` array, but we need multiple secrets
in the config to support rotation.  Or the `verifiers` which are re-used
token verifier objects constructed purely from config.
Another way to think of it is that this all "dependencies", that the lambda
needs at runtime (in a "dependency injection" kind of style). 
 */
export interface ZincApiRuntime {
  cognito: CognitoConfig,
  authzSigningSecret: string,
  authzSecrets: string[],
  database: UserTableV1Db,
  apiPathPrefix: string,

  rsaVerifier: {
    // "MultiIssuer" might be better, but this seems simpler right now
    googleCognito: JwtRsaVerifierSingleIssuer<RsaVerifierProps>,
    emailCognito: JwtRsaVerifierSingleIssuer<RsaVerifierProps>,
    githubCognito: JwtRsaVerifierSingleIssuer<RsaVerifierProps>,
    googleDirect: JwtRsaVerifierSingleIssuer<RsaVerifierProps>,
    facebookDirect: JwtRsaVerifierSingleIssuer<RsaVerifierProps>,
    aafDirect: JwtRsaVerifierSingleIssuer<RsaVerifierProps>,
  },

  directAuthn: {
    github: OAuthClientConfig,
    google: OAuthClientConfig,
    facebook: OAuthClientConfig,
    twitter: DirectTwitterAuthnConfig,
    aaf: OAuthClientConfig,
  }
}

export interface RsaVerifierProps {
  issuer: string,
  audience: string,
  jwksUri: string,
}

// time spent in initConfig() is part of the "cold start" 
let runtime: Promise<ZincApiRuntime> = initRuntime();

async function initRuntime(): Promise<ZincApiRuntime>{
  if( runtime ){
    return runtime;
  }

  const configResults = await Promise.all([
    readZincApiConfigFromSsm(process.env.ZINC_API_CONFIG_SSM_PARAM),
    readOAuthConfigFromSsm(process.env.DIRECT_GOOGLE_OAUTH_CONFIG_SSM_PARAM),
    readOAuthConfigFromSsm(process.env.DIRECT_GITHUB_OAUTH_CONFIG_SSM_PARAM),
    readOAuthConfigFromSsm(process.env.DIRECT_FACEBOOK_OAUTH_CONFIG_SSM_PARAM),
    readTwitterConfigFromSsm(process.env.DIRECT_TWITTER_OAUTH_CONFIG_SSM_PARAM),
    readOAuthConfigFromSsm(process.env.DIRECT_AAF_OAUTH_CONFIG_SSM_PARAM),
  ]);

  const configErrors = configResults.filter(it=> isError(it));
  if( configErrors.length > 0 ){
    console.log("some config errors", configErrors);
    throw configErrors[0];
  }
  
  const zincApiConfig = configResults[0] as ZincApiConfig;
  const googleDirectConfig = configResults[1] as OAuthClientConfig;
  const githubDirectConfig = configResults[2] as OAuthClientConfig;
  const facebookDirectConfig = configResults[3] as OAuthClientConfig;
  const twitterDirectConfig = configResults[4] as DirectTwitterAuthnConfig;
  const aafDirectConfig = configResults[5] as OAuthClientConfig;
  
  console.log("SSM read and validated");
  
  const region = zincApiConfig.cognito.region;
  
  return {
    cognito: {
      region: zincApiConfig.cognito.region,
      email: zincApiConfig.cognito.email,
      google: zincApiConfig.cognito.google,
      github: zincApiConfig.cognito.github,
    },
    directAuthn: {
      github: githubDirectConfig,
      google: googleDirectConfig,
      facebook: facebookDirectConfig,
      twitter: twitterDirectConfig,
      aaf: aafDirectConfig,
    },
    authzSecrets: zincApiConfig.authzSecrets,
    authzSigningSecret: getAuthzSigningSecret(zincApiConfig.authzSecrets),
    database: new UserTableV1Db(new DynamoDB({}), tableName),
    // IMPROVE: stick this in Shared now that we can 
    apiPathPrefix: `/${prdApiPath}/`,

    // used to verify all authn flows that use certificates    
    rsaVerifier: {
      emailCognito: createCognitoJwtRsaVerifier(
        {region, ...zincApiConfig.cognito.email} ),
      googleCognito: createCognitoJwtRsaVerifier(
        {region, ...zincApiConfig.cognito.google} ),
      githubCognito: createCognitoJwtRsaVerifier(
        {region, ...zincApiConfig.cognito.github} ),
      googleDirect: JwtRsaVerifier.create({
        issuer: googleIssuerUrl,
        audience: googleDirectConfig.clientId,
        jwksUri: googleJwksUrl,
      }),
      facebookDirect: JwtRsaVerifier.create({
        issuer: facebookIssuerUrl,
        audience: facebookDirectConfig.clientId,
        jwksUri: facebookJwksUrl,
      }),
      aafDirect: JwtRsaVerifier.create({
        issuer: aaf.issuer,
        audience: aafDirectConfig.clientId,
        jwksUri: aaf.jwks,
      }),
    },
  }
}


export const handler: Handler<LambdaFunctionUrlEvent, LambdaResponse> = 
  async (event)=> 
{
  DANGERouslyLogEvent(name, event);

  try {
    
    const authApiResult = await dispatchAuthApiCall(await runtime, event);
    if( authApiResult ){
      return formatSuccessResponse(authApiResult);
    }
    
    const postApiResult = await dispatchPostCall(await runtime, event);
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
  config: ZincApiRuntime,
  event: LambdaFunctionUrlEvent
):Promise<undefined | object>{
  const {method} = event.requestContext.http; 
  if( method !== "GET"){
    return undefined;
  }

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
  config: ZincApiRuntime,
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
  config: ZincApiRuntime,
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


