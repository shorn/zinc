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
    // must match what is configured in the Twitter developer console
    const callbackUrl = `https://${event.headers.host}/idpresponse`;
    
    const api = new TwitterApi();
    const authUrl = await api.getAppOAuthToken({
      consumerKey: config.twitterConsumerKey,
      consumerSecret: config.twitterConsumerSecret,
      callbackUrl
    });
    
    // turns out, you don't need the oauthTokenSecret for authentication
    return formatRedirectResponse(twitter.authorizeUrl +
      `?oauth_token=${authUrl.oAuthToken}&oauth_state=xxxxxx`);
  }
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseTwitterIdpResponse(query);
    // can't figure out how to carry state through Twitter yet
    //  validateRedirectUri(idpResponse.state.redirectUri, config);
    //  
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
      /* twitter just doesn't give you that info, note that `verified` is about
      the blue tick, not email addresses. */
      email_verified: false,
    }

    const idToken = createIdTokenJwt({
      secret: config.jwtSecret,
      issuer: `https://${event.headers.host}`,
      // this maybe should be be just "https://zincApi-twitter or something
      audience: config.twitterConsumerKey,
      attributes: oidcClaims }) ;

    /* TODO:STO this is the missing bit, I can't figure out how to get Twitter
     to pass state so I can figure out who to redirect the idpResponse to. 
     Worst case, gonna need two Twitter OAuth apps, and we can select the 
     redirectUri based on consumerKey. */
    const redirectUri = "http://localhost:9090";
    // redirect back to the client with the new id_token
    const signedInUrl = `${redirectUri}#id_token=${idToken}`;
    return formatRedirectResponse(signedInUrl);
  }

  return undefined;
}

export const TwitterIdpResponse = zod.object({
  oauthToken: zod.string(),
  oauthVerfier: zod.string(),
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

  const {oauth_token, oauth_verifier} = query;
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

  //let decodedString = decodeBase64(state);
  //console.log("/idpresponse", code, decodedString);
  //const decodedState = JSON.parse(decodedString);
  //
  //if( !decodedState.redirectUri ){
  //  throw new AuthError({
  //    publicMsg: GENERIC_DENIAL,
  //    privateMsg: "/idpresponse missing [state.redirectUri]"
  //  });
  //}
  return {
    oauthToken: oauth_token,
    oauthVerfier: oauth_verifier,
  };
}
