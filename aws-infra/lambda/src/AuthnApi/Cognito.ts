import { LambdaEventHeaders } from "Util/LambdaEvent";
import { AuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { URLSearchParams } from "url";
import {
  GithubTokenResponse,
  ZincMappedOidcAttributes
} from "AuthnApi/Downstream/GithubApi";
import { getBearerToken } from "Util/Header";
import { OAuthTokenRequest, signHs256Jwt } from "AuthnApi/OAuth";

export type CognitoTokenResponse = GithubTokenResponse & {
  id_token: string,
}



/* see /doc/lambda/oidc-token-event.md
decoded body (wrapped on `&`):
 grant_type=authorization_code
 &redirect_uri=https%3A%2F%2F<user pool domain>.auth.<region>.amazoncognito.com%2Foauth2%2Fidpresponse
 &client_id=<Github ClientId>
 &client_secret=<Github CLIENT SECRET!>
 &code=xxx
 
 Presumably, the github client id/secret come from OUR config of the 
 UserPool identity provider (otherwise it would've had to come 
 over the wire from Github).
*/
export function parseTokenRequest(
  requestBody: string | undefined
): OAuthTokenRequest{
  if( !requestBody ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "Cognito /token request without body"
    });
  }

  // do not log the body without protecting the secrets it contains
  const bodyString = Buffer.from(requestBody, 'base64').toString('ascii');
  const body = new URLSearchParams(bodyString);
  validateMandatorySearchParam({
    msgPrefix: "Cognito /token request body",
    params: body,
    paramNames: [
      "grant_type", "redirect_uri", "client_id", "client_secret", "code"
    ]
  });


  /* convert to simple object, ignoring potential extra fields in the 
  Cognito request we don't know about. */
  return {
    grant_type: body.get("grant_type")!,
    redirect_uri: body.get("redirect_uri")!,
    client_id: body.get("client_id")!,
    client_secret: body.get("client_secret")!,
    code: body.get("code")!,
    /* I didn't actually see a state param in my testing, but the original
    code had it so I put it in. */
    state: body.get("state") ?? undefined,
  }
}

function validateMandatorySearchParam({params, paramNames, msgPrefix}: {
  msgPrefix?: string,
  params: URLSearchParams,
  paramNames: string[],
}){
  paramNames.forEach(it => {
    if( !params.has(it) ){
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          `${msgPrefix || "params"} did not contain [${it}]`
      });
    }
  });
}

export function createIdTokenJwt({
  secret, issuer, audience, attributes
}: {
  secret: string,
  issuer: string,
  audience: string,
  attributes: ZincMappedOidcAttributes,
}): string{
  return signHs256Jwt({
    /* Must match the client_secret set in the UserPool IdProvider, 
    otherwise error redirect:     
    "invalid_token_signature: Error when verifying Symmetric MAC" */
    secret: secret,
    signOptions: {
      /* `issuer` has to match the `oidc_issuer` we set in the IdProvider we 
      created in the CognitoGithubStack (i.e. the FunctionUrl).
      For example: `https://xxx.lambda-url.ap-southeast-2.on.aws`
      If not, you get error redirect: "Bad id_token issuer <issuer>". */
      issuer,
      /* presumably must match the UserPool IdProvider clientId */
      audience,
      /* For our usage, idToken only needs to live long enough for browser 
      to exchange it for our custom accessToken (since Zinc doesn't
      make use of identity pools. */
      expiresIn: 20,
    },
    /* if this is populated with all defined attributes, then Cognito won't
    wait for the /userinfo call, it will create the user and sign them in
    straight away, note though that it will still call /userinfo. */
    payload: attributes,
  });
}

export function formatTokenResponse({
  idToken, githubToken
}: {
  idToken: string,
  githubToken: GithubTokenResponse,
}): CognitoTokenResponse{
  /* GitHub returns scopes separated by commas, but OAuth wants them to 
  be spaces:  https://tools.ietf.org/html/rfc6749#section-5.1
  Also, we need to add openid as a scope, since GitHub will have stripped it. */
  const openIdScope = `openid ${githubToken.scope.replace(',', ' ')}`;

  return {
    /* `access_token` will be passed as the bearer token in the 
    `Authorization` header of the /userinfo call that will cognito will make
    after this request returns. Other than that, Zinc doesn't use it.*/
    access_token: githubToken.access_token,
    /* This will be exchange for the custom Zinc accessToken that all Zinc API
    endpoints are verified with. */
    id_token: idToken,
    token_type: githubToken.token_type,
    scope: openIdScope,
  };
}

export function parseUserInfoAccessToken(
  headers: LambdaEventHeaders
): string {
  const accessToken = getBearerToken(headers);
  if( !accessToken ){
    console.error("malformed /userinfo request headers", headers);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        `Cognito OIDC /userinfo request contained no accessToken`
    });
  }

  return accessToken;
}
