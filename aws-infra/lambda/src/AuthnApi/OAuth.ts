import { LamdbaQueryStringParameters } from "Util/LambdaEvent";
import { AuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { sign, SignOptions } from "jsonwebtoken";
import { ZincOAuthState } from "Shared/ApiTypes";
import { z as zod } from "zod";
import { decodeBase64 } from "Util/Encoding";

/**
 * https://www.oauth.com/oauth2-servers/single-page-apps/
 */
export type AuthorizeCodeGrantParameters = {
  // we only ever use the authorization code grant flow
  response_type: "code",
  client_id: string,
  scope: string,
  state?: string,
  redirect_uri?: string,
};

export type IdpResponseRedirectParameters = {
  code: string,
  state: string,
};

export type OAuthIdpResponse = {
  code: string,
  state: object,
}


export function parseAuthorizeCodeGrantRequest(
  query: LamdbaQueryStringParameters | undefined
): AuthorizeCodeGrantParameters{
  // see /doc/lambda/oidc-api-authorize-event.md
  if( !query ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "auth call with no query params"
    });
  }

  const {client_id, scope, state, response_type, code, redirect_uri} = query;
  if( !client_id ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize missing client_id param"
    });
  }
  if( !scope ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize missing scope param"
    });
  }
  if( !state ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize missing state param"
    });
  }
  if( !response_type ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize missing response_type param"
    });
  }
  if( response_type !== "code" ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "/authorize unknown [response_type] value: " + code
    });
  }

  // cognito integration doesn't use redirect_uri 

  return {
    client_id, scope, state, response_type, redirect_uri
  }
}

export function signHs256Jwt({
  secret, signOptions, payload
}: {
  secret: string,
  signOptions: SignOptions,
  payload: Record<string, string | boolean | number>,
}): string{
  return sign(payload, secret, {
    ...signOptions,
    algorithm: "HS256",
  });
}


/**
 * This module contains stuff about the Cognito side of the integration,
 * i.e. stuff related to the calls that Cognito will make to our lambda.
 */

export type OAuthTokenRequest = {
  grant_type: string,
  client_id: string,
  client_secret: string,
  code: string,
  redirect_uri?: string,
  state?: string,
};



/**
 * This specifically about Zinc state, which should always be a json object with
 * the params as defined.
  */ 
export type ZincOAuthIdpResponse = {
  code: string,
  state: ZincOAuthState,
}


// see zinc-google-token-response.md
export const OAuthTokenResponse = zod.object({
  access_token: zod.string(),
  expires_in: zod.number(),
  // facebook and AAF, don't return scope
  scope: zod.string().optional(),
  token_type: zod.string(),
  id_token: zod.string(),
});
export type OAuthTokenResponse = zod.infer<typeof OAuthTokenResponse>;

// see zinc-google-token-response.md
export const OAuthIdToken = zod.object({
  iss: zod.string(),
  aud: zod.string(),
  sub: zod.string(),
  email: zod.string(),
  email_verified: zod.boolean(),
  iat: zod.number(),
  exp: zod.number(),
});
export type OAuthIdToken = zod.infer<typeof OAuthIdToken>;

export function validateRedirectUri(
  redirect_uri: string,
  allowedCallbackUrls: string[],
){
  if( !allowedCallbackUrls.includes(redirect_uri) ){
    console.log("allowed urls", allowedCallbackUrls);
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
