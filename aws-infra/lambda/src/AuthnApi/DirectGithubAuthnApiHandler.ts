import { AuthError, forceError, isError } from "Util/Error";
import {
  formatErrorResponse,
  formatRedirectResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse,
  LamdbaQueryStringParameters
} from "Util/LambdaEvent";
import { GithubApi } from "AuthnApi/Downstream/GithubApi";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { decodeBase64 } from "Util/Encoding";
import { createIdTokenJwt } from "AuthnApi/Cognito";
import { ZincOAuthState } from "Shared/ApiTypes";
import { OAuthClientConfig, readOAuthConfigFromSsm } from "LambdaConfig";
import { validateRedirectUri } from "AuthnApi/OAuth";

const name = "DirectGithubAuthnApi";

// time spent in here is part of the "cold start" 
let config: Promise<OAuthClientConfig> = initConfig();

async function initConfig(): Promise<OAuthClientConfig>{
  if( config ){
    return config;
  }

  const result = await readOAuthConfigFromSsm(
    process.env.DIRECT_GITHUB_AUTHN_CONFIG_SSM_PARAM );
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
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseIdpResponse(query);
    validateRedirectUri(idpResponse.state.redirectUri, 
      config.allowedCallbackUrls);
 
    const githubApi = new GithubApi();
    const githubToken = await githubApi.getToken({
      code: idpResponse.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "code"
    });
    validateGithubTokenScope(githubToken.scope);
    
    const attributes = await githubApi.mapOidcAttributes(
      githubToken.access_token );

    const idToken = createIdTokenJwt({
      secret: config.clientSecret,
      issuer: `https://${event.headers.host}`,
      audience: config.clientId,
      attributes }) ;

    // redirect back to the client with the new id_token
    const signedInUrl = `${idpResponse.state.redirectUri}#id_token=${idToken}`;
    return formatRedirectResponse(signedInUrl);
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

export type ZincOAuthIdpResonse = {
  code: string,
  state: ZincOAuthState,
}

function parseIdpResponse(
  query: LamdbaQueryStringParameters | undefined
): ZincOAuthIdpResonse {
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


