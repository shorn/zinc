import { AuthError } from "Util/Error";
import {
  formatErrorResponse,
  formatRedirectResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse,
  LamdbaQueryStringParameters
} from "Util/LambdaEvent";
import { readJsonParam } from "Util/Ssm";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { decodeBase64 } from "Util/Encoding";
import {
  OAuthClientConfig,
  oAuthClientConfigExample,
  oAuthClientConfigHelp,
  ZincOAuthIdpResponse
} from "OAuth/OAuth";
import { GoogleApi } from "Downstream/GoogleApi";

const name = "ZincGoogleAuthnV1";

// time spent in here is part of the "cold start" 
let config: Promise<OAuthClientConfig> = initConfig();


// bump lambda to force re-reading config
async function initConfig(): Promise<OAuthClientConfig>{
  if( config ){
    return config;
  }
  try {
    const paramValue = await readJsonParam(
      process.env.GOOGLE_CLIENT_OAUTH_CONFIG_SSM_PARAM);
    return OAuthClientConfig.parse(paramValue);
  }
  catch( err ){
    console.log("problem parsing lambda config", 
      oAuthClientConfigHelp, JSON.stringify(oAuthClientConfigExample, undefined, 1) );
    throw err;
  }
}

export async function handler(
  event: LambdaFunctionUrlEvent,
): Promise<LambdaResponse>{
  console.log(name + " exec");

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
    // don't leak error messages to caller
    return formatErrorResponse(500, GENERIC_DENIAL);
  }
}

async function dispatchApiCall(
  event: LambdaFunctionUrlEvent,
  config: OAuthClientConfig
):Promise<LambdaResponse|undefined>{
  console.log(name + " API event", event);
  const {method, path} = event.requestContext.http; 
  const query = event.queryStringParameters;
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseIdpResponse(query);
    validateRedirectUri(idpResponse.state.redirectUri, config);
 
    const googleApi = new GoogleApi();

    /* logging this will log the access and id tokens - not quite as bad as 
    logging a secret since it has an expiry, but still not something we want 
    to leak. */
    const googleToken = await googleApi.getToken({
      code: idpResponse.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: `https://${event.headers.host}/idpresponse`
    });
    validateGoogleTokenScope(googleToken.scope);
    
    // redirect back to the client with the new id_token
    const signedInUrl = idpResponse.state.redirectUri + 
      `#id_token=${googleToken.id_token}`;
    return formatRedirectResponse(signedInUrl);
  }

  return undefined;
}

function validateGoogleTokenScope(
  scope: string,
){
  const scopes = scope.trim().toLowerCase().split(" ");
  
  if( scopes.length !== 2 ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "google /token [scope] problem, count: " + scope,
    });
  }
  if( !scopes.includes("openid") ){
    console.log("parsed scopes", scopes);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "google /token [scope] problem, openid: " + scope,
    });
  }
  if( !scopes.includes("https://www.googleapis.com/auth/userinfo.email") ){
    console.log("parsed scopes", scopes);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "google /token [scope] problem, userinfo.email: " + scope,
    });
  }
}

function validateRedirectUri(
  redirect_uri: string,
  config: OAuthClientConfig,
){
  if( !config.allowedCallbackUrls.includes(redirect_uri) ){
    console.log("allowed urls", config.allowedCallbackUrls);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "[redirect_uri] not in allowed callback urls: " + 
        redirect_uri,
    });
  }
}


export function parseIdpResponse(
  query: LamdbaQueryStringParameters | undefined
): ZincOAuthIdpResponse {
  if( !query ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse no query params"
    });
  }

  const {code, state} = query;
  if( !code ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse missing [code] param"
    });
  }
  if( !state ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse missing [state] param"
    });
  }

  let decodedString = decodeBase64(state);
  console.log("/idpresponse", code, decodedString);
  const decodedState = JSON.parse(decodedString);

  if( !decodedState.redirectUri ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse missing [state.redirectUri]"
    });
  }
  return {
    code,
    state: decodedState
  };
}
