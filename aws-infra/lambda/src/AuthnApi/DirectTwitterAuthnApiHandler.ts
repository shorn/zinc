import { AuthError, isError } from "Util/Error";
import {
  formatErrorResponse,
  formatRedirectResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse,
  LamdbaQueryStringParameters
} from "Util/LambdaEvent";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { z as zod } from "zod";
import { TwitterApi } from "AuthnApi/Downstream/TwitterApi";
import { twitter } from "Shared/Constant";
import { createIdTokenJwt } from "AuthnApi/Cognito";
import {
  DirectTwitterAuthnConfig,
  readTwitterConfigFromSsm
} from "LambdaConfig";
import { decodeBase64 } from "Util/Encoding";
import { ZincOAuthState } from "Shared/ApiTypes";
import { validateRedirectUri } from "AuthnApi/OAuth";

const name = "DirectTwitterAuthnApi";

// time spent in here is part of the "cold start" 
let config: Promise<DirectTwitterAuthnConfig> = initConfig();

async function initConfig(): Promise<DirectTwitterAuthnConfig>{
  if( config ){
    return config;
  }
  const result = await readTwitterConfigFromSsm(
    process.env.DIRECT_TWITTER_AUTHN_CONFIG_SSM_PARAM );
  if( isError(result) ){
    throw result;
  }
  return result;
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
  config: DirectTwitterAuthnConfig
):Promise<LambdaResponse|undefined>{
  console.log(name + " API event", event);
  const {method, path} = event.requestContext.http; 
  const query = event.queryStringParameters;

  if( method === "GET" && path === "/authorize" ){
    const parsedState = parseAuthorizeRequest(query);
    validateRedirectUri(parsedState.redirectUri, config.allowedCallbackUrls);

    /* AWS helpfully decoded this for us before adding it to the 
    queryStringParameters, but we have to re-encode it because it will be used
    to invoke the /idpresponse and Twitter won't encode it.
    `query` and `state` can be assumed because validate didn't fail. */
    const encodedState = encodeURIComponent(query?.state!);
    
    /* callbackBase must match what is configured in the Twitter developer 
    console, but without query parameters.
    Twitter will redirect the browser to the calbackUrl, including parameters, 
    once Twitter and the user have approved this request to sign in. */
    const callbackBase = `https://${event.headers.host}/idpresponse`;
    const callbackUrl = `${callbackBase}?state=${encodedState}`;
    
    const api = new TwitterApi();
    const authUrl = await api.getAppOAuthToken({
      consumerKey: config.twitterConsumerKey,
      consumerSecret: config.twitterConsumerSecret,
      callbackUrl
    });

    /* Turns out, you don't need the oauthTokenSecret for authentication.
    I guess because we're only doing "user stuff" when we authenticate, 
    not "app stuff". 
    For "user stuff", you need a user-specific oauthToken/oauthTokenSecret.
    The "app" oauth token is only needed for the "app" to be authorised to 
    retrieve the "user credentials". */
    return formatRedirectResponse(twitter.authenticateUrl +
      `?oauth_token=${authUrl.oAuthToken}`);
  }
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseTwitterIdpResponse(query);
    validateRedirectUri(idpResponse.state.redirectUri, 
      config.allowedCallbackUrls);
    
    const api = new TwitterApi();
    const accessToken = await api.getUserOAuthToken({
      consumerKey: config.twitterConsumerKey,
      consumerSecret: config.twitterConsumerSecret,
      oauthToken: idpResponse.oauthToken,
      oauthVerifier: idpResponse.oauthVerfier,
    });
    
    const userDetails = await api.getUserVerifiyCredentials({
      consumerKey: config.twitterConsumerKey,
      consumerSecret: config.twitterConsumerSecret,
      oauthToken: accessToken.oAuthToken,
      oauthTokenSecret: accessToken.oAuthTokenSecret,
    });

    const email = userDetails.email ? userDetails.email : 
      `${userDetails.id}@noreply.${event.headers.host}`;
    const oidcClaims = {
      // OIDC says this must be string
      sub: userDetails.id.toString(),
      email: email,
      /* twitter just doesn't give you that info 
      `verified` is about the "blue tick", not email addresses */
      email_verified: false,
    }

    const idToken = createIdTokenJwt({
      secret: config.idTokenSecret,
      issuer: `https://${event.headers.host}`,
      /* this maybe should be be just "https://zincApi-twitter or something,
      it doesn't need to be the consumerKey, I just don't feel like adding
      more config right now. */
      audience: config.twitterConsumerKey,
      attributes: oidcClaims }) ;

    // redirect back to the client with the new id_token
    const signedInUrl = `${idpResponse.state.redirectUri}#id_token=${idToken}`;
    return formatRedirectResponse(signedInUrl);
  }

  return undefined;
}

function parseAuthorizeRequest(
  query?: LamdbaQueryStringParameters
): ZincOAuthState{
  if( !query ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize no query params"
    });
  }

  const {state} = query;
  if( !state ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize missing [state] param"
    });
  }

  let decodedString = decodeBase64(state);
  const json = JSON.parse(decodedString);
  return ZincOAuthState.parse(json);
}

export const TwitterIdpResponse = zod.object({
  oauthToken: zod.string(),
  oauthVerfier: zod.string(),
  state: ZincOAuthState,
});
export type TwitterIdpResponse = zod.infer<typeof TwitterIdpResponse>;

function parseTwitterIdpResponse(
  query: LamdbaQueryStringParameters | undefined
): TwitterIdpResponse {
  if( !query ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse no query params"
    });
  }

  const {oauth_token, oauth_verifier, state} = query;
  if( !oauth_token ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse missing [oauth_token] param"
    });
  }
  if( !oauth_verifier ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse missing [oauth_verifier] param"
    });
  }
  if( !state ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/idpresponse missing [state] param"
    });
  }

  // param has already been "un-UriEncoded" by the lambda infrasructure
  let decodedString = decodeBase64(state);
  const json = JSON.parse(decodedString);
  const decodedOAuthState = ZincOAuthState.parse(json)
  
  return {
    oauthToken: oauth_token,
    oauthVerfier: oauth_verifier,
    state: decodedOAuthState, 
  };
}
