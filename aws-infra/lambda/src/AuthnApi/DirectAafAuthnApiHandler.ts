import { AuthError, forceError, isError } from "Util/Error";
import {
  DANGERouslyLogEvent,
  formatErrorResponse,
  formatSuccessResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse
} from "Util/LambdaEvent";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { OAuthClientConfig, readOAuthConfigFromSsm } from "LambdaConfig";
import { parseIdpResponse, validateRedirectUri } from "AuthnApi/OAuth";

const name = "DirectAafAuthnApi";

// time spent in here is part of the "cold start" 
let config: Promise<OAuthClientConfig> = initConfig();

async function initConfig(): Promise<OAuthClientConfig>{
  if( config ){
    return config;
  }

  const result = await readOAuthConfigFromSsm(
    process.env.DIRECT_AAF_AUTHN_CONFIG_SSM_PARAM );
  if( isError(result) ){
    throw result;
  }
  return result;
}

export async function handler(
  event: LambdaFunctionUrlEvent,
): Promise<LambdaResponse>{
  console.log(name + " exec ");

  try {

    const apiResult = await dispatchApiCall(event, await config);
    if( apiResult ){
      return apiResult;
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
}

async function dispatchApiCall(
  event: LambdaFunctionUrlEvent,
  config: OAuthClientConfig
):Promise<LambdaResponse|undefined>{
  const {method, path} = event.requestContext.http; 
  const query = event.queryStringParameters;
  DANGERouslyLogEvent(name, event);
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseIdpResponse(query);
    validateRedirectUri(idpResponse.state.redirectUri, 
      config.allowedCallbackUrls);
 
    //const githubApi = new GithubApi();
    //const githubToken = await githubApi.getToken({
    //  code: idpResponse.code,
    //  client_id: config.clientId,
    //  client_secret: config.clientSecret,
    //  grant_type: "code"
    //});
    //validateGithubTokenScope(githubToken.scope);
    //
    //const attributes = await githubApi.mapOidcAttributes(
    //  githubToken.access_token );
    //
    //const idToken = createIdTokenJwt({
    //  secret: config.clientSecret,
    //  issuer: `https://${event.headers.host}`,
    //  audience: config.clientId,
    //  attributes }) ;
    //
    //// redirect back to the client with the new id_token
    //const signedInUrl = `${idpResponse.state.redirectUri}#id_token=${idToken}`;
    //return formatRedirectResponse(signedInUrl);
    
    return formatSuccessResponse({message: "work in progress"});
  }

  return undefined;
}

function validateGithubTokenScope(
  scope: string,
){
  // IMPROVE: need to parse the scope, I doubt the order is guaranteed
  if( scope !== "read:user,user:email" ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "github /access_token returned unexpected [scope]: " + scope,
    });
  }
}

