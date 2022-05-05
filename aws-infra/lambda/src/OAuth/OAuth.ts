import { LamdbaQueryStringParameters } from "Util/LambdaEvent";
import { AuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { sign, SignOptions } from "jsonwebtoken";

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

