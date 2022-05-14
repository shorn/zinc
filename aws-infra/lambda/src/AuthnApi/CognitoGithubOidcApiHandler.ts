import { AuthError, forceError } from "Util/Error";
import {
  formatErrorResponse,
  formatRedirectResponse,
  formatSuccessResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse
} from "Util/LambdaEvent";
import {
  createIdTokenJwt,
  formatTokenResponse,
  parseTokenRequest,
  parseUserInfoAccessToken,
} from "AuthnApi/Cognito";
import {
  getAuthorizeUrlRedirect,
  GithubApi
} from "AuthnApi/Downstream/GithubApi";
import { parseAuthorizeCodeGrantRequest } from "AuthnApi/OAuth";

const name = "CognitoGithubOidcApi";

/* This has no config at all because Cognito passes all necessary info
in the endpoint calls. */
export async function handler(
  event: LambdaFunctionUrlEvent,
): Promise<LambdaResponse>{
  console.log(name + " exec");

  try {

    const oidcApiResult = await dispatchOidcApiCall(event);
    if( oidcApiResult ){
      return oidcApiResult;
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

async function dispatchOidcApiCall(
  event: LambdaFunctionUrlEvent
):Promise<LambdaResponse|undefined>{
  /* be careful with logging params because the Cognito passes the client_secret
  to the /token endpoint */
  //console.log("OIDC API event", event);
  const {method, path} = event.requestContext.http; 
  const query = event.queryStringParameters;

  if( method === "GET" && path === "/authorize" ){
    const params = parseAuthorizeCodeGrantRequest(query);
    const githubAuthUrl = getAuthorizeUrlRedirect(params);
    return formatRedirectResponse(githubAuthUrl);
  }

  if( method === "POST" && path === "/token" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const tokenRequest = parseTokenRequest(event.body);

    const githubApi = new GithubApi();
    const githubToken = await githubApi.getToken(tokenRequest)
    console.log("githubToken", githubToken);
    
    const attributes = await githubApi.mapOidcAttributes(
      githubToken.access_token );
    
    const idToken = createIdTokenJwt({
      secret: tokenRequest.client_secret,
      issuer: `https://${event.headers.host}`,
      audience: tokenRequest.client_id,
      attributes });
    const tokenResponse = formatTokenResponse({idToken, githubToken});
    console.log("token response", tokenResponse);
    
    return formatSuccessResponse(tokenResponse);
  }

  if( method === "GET" && path === "/userinfo" ){
    const accessToken = parseUserInfoAccessToken(event.headers);
    
    const githubApi = new GithubApi();
    const attributes = await githubApi.mapOidcAttributes(accessToken);

    return formatSuccessResponse(attributes);
  }
  
  return undefined;
}





