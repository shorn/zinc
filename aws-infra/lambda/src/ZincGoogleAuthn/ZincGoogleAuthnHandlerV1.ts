import { AuthError, forceError } from "Util/Error";
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
import { OAuthClientConfig, ZincOAuthIdpResponse } from "OAuth/OAuth";

const name = "ZincGoogleAuthnV1";

// time spent in here is part of the "cold start" 
let config: Promise<OAuthClientConfig> = initConfig();


// bump lambda to force re-reading config
async function initConfig(): Promise<OAuthClientConfig>{
  if( config ){
    return config;
  }

  const oauthConfig = await readJsonParam<OAuthClientConfig>(
    process.env.GOOGLE_CLIENT_OAUTH_CONFIG_SSM_PARAM, []);
  
  return {
    clientId: oauthConfig.clientId,
    clientSecret: oauthConfig.clientSecret,
    allowedCallbackUrls: oauthConfig.allowedCallbackUrls,
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
    return formatErrorResponse(500, forceError(err).message);
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
 
    // TODO:STO start here
    //const githubApi = new GithubApi();
    //const githubToken = await githubApi.getToken({
    //  code: idpResponse.code,
    //  client_id: config.githubClientId,
    //  client_secret: config.githubClientSecret,
    //  grant_type: "code"
    //});
    //console.log("githubToken", githubToken);
    //validateGithubTokenScope(githubToken.scope);
    //
    //const attributes = await githubApi.mapOidcAttributes(
    //  githubToken.access_token );
    //console.log("github attributes", attributes);
    //
    //const idToken = createIdTokenJwt({
    //  secret: config.githubClientSecret,
    //  issuer: `https://${event.headers.host}`,
    //  audience: config.githubClientId,
    //  attributes }) ;

    const idToken = "not yet implemented";
    // redirect back to the client with the new id_token
    const signedInUrl = `${idpResponse.state.redirectUri}#id_token=${idToken}`;
    return formatRedirectResponse(signedInUrl);
  }

  return undefined;
}

function validateGoogleTokenScope(
  scope: string,
){
  // TODO:STO implement
  //// IMPROVE: need to parse the scope, I doubt the order is guaranteed
  //if( scope !== "read:user,user:email" ){
  //  throw new AuthError({
  //    publicMsg: GENERIC_DENIAL,
  //    privateMsg: "github /access_token returned unexpected [scope]: " + scope,
  //  });
  //}
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
