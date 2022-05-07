import { LamdbaQueryStringParameters } from "Util/LambdaEvent";
import { AuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { sign, SignOptions } from "jsonwebtoken";
import { ZincOAuthState } from "shared";
import {z as zod} from "zod";

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


export const OAuthClientConfig = zod.object({
  clientId: zod.string(),
  clientSecret: zod.string(),
  allowedCallbackUrls: zod.string().url().array().nonempty(),
  functionUrl: zod.string().url(),
}); 
export type OAuthClientConfig = zod.infer<typeof OAuthClientConfig>;
export const oAuthClientConfigHelp = `
OAuthClientConfig:
* clientId, clientSecret 
  * sourced from OAuth configuration you create in the idprovider's UI 
    (google, github, etc.)  
  * used by the authn lambda in the processing of the "/idpresponse" call from
    the OIDC provider
  * used by the authz lambda verifying the id_token signature when exhanging 
    for an accessToken
* allowedCallbackUrls 
  * addresses that your site is served from that will be 
    "called back" once the user is authenticated 
  * examples: (localhsot for dev, cloudfront instances for test, prod, etc.)
  * used by the authn lambda to validate the state.redirect_uri
* functionUrl
  * address that the OIDC lambda is published at
  * used by the authz lambda when analysing the id_token "audience" claim
Example:   
`;
export const oAuthClientConfigExample: OAuthClientConfig = {
  clientId: "do not set in code",
  clientSecret: "do not set in code",
  allowedCallbackUrls: ["https://localhost:9090", "https://xxx.cloudfront.net/"],
  functionUrl: "https://xxx.lambda-url.ap-southeast-2.on.aws",
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
  scope: zod.string(),
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

