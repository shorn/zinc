import { AuthError, forceError, isError } from "Util/Error";
import {
  formatErrorResponse,
  formatRedirectResponse,
  formatSuccessResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse,
  LamdbaQueryStringParameters
} from "Util/LambdaEvent";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { z as zod } from "zod";
import { readJsonParam } from "Util/Ssm";
import { TwitterApi } from "AuthnApi/Downstream/TwitterApi";
import { twitter } from "Shared/Constant";

const name = "DirectTwitterAuthnApi";


export const DirectTwitterAuthnConfig = zod.object({
  consumerKey: zod.string(),
  consumerSecret: zod.string(),
  //allowedCallbackUrls: zod.string().url().array().nonempty(),
  //functionUrl: zod.string().url(),
});
export type DirectTwitterAuthnConfig = 
  zod.infer<typeof DirectTwitterAuthnConfig>;

// time spent in here is part of the "cold start" 
let config: Promise<DirectTwitterAuthnConfig> = initConfig();

export async function readTwitterConfigFromSsm(
  paramName: string|undefined
): Promise<DirectTwitterAuthnConfig|Error>{
  try {
    const paramValue = await readJsonParam(paramName);
    return DirectTwitterAuthnConfig.parse(paramValue);
  }
  catch( err ){
    console.log(`problem parsing lambda config from ${paramName}`,
      "TODO:STO help",
      "TODO:STO example" );
    return forceError(err);
  }
}

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
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
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
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      oauthToken: idpResponse.oauthToken,
      oauthVerifier: idpResponse.oauthVerfier,
    });
    
    const email = await api.getUserVerifiyCredentials({
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      oauthToken: accessToken.oAuthToken,
      oauthTokenSecret: accessToken.oAuthTokenSecret,
    });
    
  //
  //  ///* logging this will log the access and id tokens - not quite as bad as 
  //  //logging a secret since it has an expiry, but still not something we want 
  //  //to leak. */
  //  //const facebookToken = await facebookApi.getToken({
  //  //  code: idpResponse.code,
  //  //  client_id: config.clientId,
  //  //  client_secret: config.clientSecret,
  //  //  grant_type: "authorization_code",
  //  //  redirect_uri: `https://${event.headers.host}/idpresponse`
  //  //});
  //  
  //  // redirect back to the client with the new id_token
  //  const signedInUrl = idpResponse.state.redirectUri + 
  //    `#id_token=${"xxx"}`;
  //  return formatRedirectResponse(signedInUrl);
    return formatSuccessResponse({result: email});
  }

  return undefined;
}

export const TwitterIdpResponse = zod.object({
  oauthToken: zod.string(),
  oauthVerfier: zod.string(),
});
export type TwitterIdpResponse = zod.infer<typeof TwitterIdpResponse>;

export function parseTwitterIdpResponse(
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
