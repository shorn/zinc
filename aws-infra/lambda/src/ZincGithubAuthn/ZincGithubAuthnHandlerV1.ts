import { AuthError, forceError } from "Util/Error";
import {
  formatErrorResponse,
  formatRedirectResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse,
  LamdbaQueryStringParameters
} from "Util/LambdaEvent";
import { GithubApi } from "Downstream/GithubApi";
import { readStringListParam, readStringParam } from "Util/Ssm";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { decodeBase64 } from "Util/Encoding";
import { createIdTokenJwt } from "GithubOidcApi/CognitoApi";
import { ZincOAuthState } from "shared";

const name = "ZincGithubAuthnV1";

// time spent in here is part of the "cold start" 
let config: Promise<ZincGithubV1Config> = initConfig();
export interface ZincGithubV1Config {
  githubClientId: string,
  githubClientSecret: string,
  allowedCallbackUrls: string[],
}


// bump lambda to force re-reading config
async function initConfig(): Promise<ZincGithubV1Config>{
  if( config ){
    return config;
  }

  const githubClientId = readStringParam(
    process.env.GITHUB_CLIENT_ID_SSM_PARAM);
  const githubClientSecret = readStringParam(
    process.env.GITHUB_CLIENT_SECRET_SSM_PARAM);
  const allowedCallbackUrls = readStringListParam(
    process.env.GITHUB_CALLBACK_URLS_SSM_PARAM);
  
  return {
    githubClientId: await githubClientId,
    githubClientSecret: await githubClientSecret,
    allowedCallbackUrls: await allowedCallbackUrls,
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
  config: ZincGithubV1Config
):Promise<LambdaResponse|undefined>{
  console.log("ZincGithubAuthn API event", event);
  const {method, path} = event.requestContext.http; 
  const query = event.queryStringParameters;
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseIdpResponse(query);
    validateRedirectUri(idpResponse.state.redirectUri, config);
 
    const githubApi = new GithubApi();
    const githubToken = await githubApi.getToken({
      code: idpResponse.code,
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      grant_type: "code"
    });
    console.log("githubToken", githubToken);
    validateGithubTokenScope(githubToken.scope);
    
    const attributes = await githubApi.mapOidcAttributes(
      githubToken.access_token );
    console.log("github attributes", attributes);

    const idToken = createIdTokenJwt({
      secret: config.githubClientSecret,
      issuer: `https://${event.headers.host}`,
      audience: config.githubClientId,
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

function validateRedirectUri(
  redirect_uri: string,
  config: ZincGithubV1Config,
){
  if( !config.allowedCallbackUrls.includes(redirect_uri) ){
    //console.log("allowed urls", config.allowedCallbackUrls);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "[redirect_uri] not in allowed callback urls: " + 
        redirect_uri,
    });
  }
}

export type ZincOAuthIdpResonse = {
  code: string,
  state: ZincOAuthState,
}

export function parseIdpResponse(
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
