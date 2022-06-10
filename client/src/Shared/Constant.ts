/* Hardcoded because Zinc is only designed to work with public Github, not
the enterprise version. */

// https://aaf.freshdesk.com/support/solutions/articles/19000096640-openid-connect-
export const aaf = {
  authorize: "https://central.test.aaf.edu.au/providers/op/authorize",
  issuer: "https://central.test.aaf.edu.au",
  token: "https://central.test.aaf.edu.au/providers/op/token",
  jwks: "https://central.test.aaf.edu.au/providers/op/jwks",
  userInfo: "https://central.test.aaf.edu.au/providers/op/userinfo",
  authnScope: "openid profile email",
}

export const github = {
  authorize: "https://github.com/login/oauth/authorize",
  token: "https://github.com/login/oauth/access_token",
  userDetail: "https://api.github.com/user",
  userEmails: "https://api.github.com/user/emails",
  authnScope: "read:user,user:email",
}

export const googleAuthorizeUrl = "https://accounts.google.com/o/oauth2/v2/auth";
export const googleIssuerUrl = "https://accounts.google.com";
export const googleJwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
export const googleTokenUrl = "https://oauth2.googleapis.com/token";
export const googleAuthnScope = "openid email";

// https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/
export const facebookAuthorizeUrl = "https://facebook.com/dialog/oauth/";
export const facebookIssuerUrl = "https://www.facebook.com";
export const facebookJwksUrl = "https://www.facebook.com/.well-known/oauth/openid/jwks/";
export const facebookTokenUrl = "https://graph.facebook.com/v13.0/oauth/access_token"; 
export const facebookAuthnScope = "openid email";

export const twitter = {
  tokenRequestUrl: "https://api.twitter.com/oauth/request_token",
  /** `/authorize` will ask for permission every time, `/authenticate` will 
   * remember if user had previously approved our app. */
  authenticateUrl: "https://api.twitter.com/oauth/authenticate",
  accessTokenUrl: "https://api.twitter.com/oauth/access_token",
  verifyCredentialsUrl: "https://api.twitter.com/1.1/account/verify_credentials.json",
};

/** There are many different  
 */
export const oauthCodeGrantFlow = "code";

export function formatCognitoIdpUrl({region, userPoolId}:{
  region: string,
  userPoolId: string,
}): string{
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

