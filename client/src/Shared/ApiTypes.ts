import { z as zod } from "zod";

/**
 note that bearer tokens (`id_Token` and `accessToken`) are transferred 
 "out of band" in the auth header and handled on both client and server by 
 infrastructure code rather than the application/business logic.
 `accessToken` is modelled here as optional so that:
 - client code can call it without passing the token and the infrastructure
   will take care of putting the token into the auth header 
 - server code can read the token from the auth header and bind it in when
   calling the implementation function so we have a standard place for it to be
   passed to the implementation functions.  
*/
export type AuthorizedPost<TReqest, TResult> =
  (req: TReqest, accessToken?: string) => Promise<TResult>;

//export type PostEndpoints<TReqest, TResult> = {
//  [name: string]:AuthorizedPost<TReqest, TResult>;
//}

/**
 * Endpoints for doing API calls where access is restricted by  
 * authorization rules.
 * They all have the same shape, but with specific input and output types.
 */
export type PostApi = {
  /** List publicly available data for all users.
   * Any user with an enabled account can call this.
   * Will eventually need params for pagination, sorting, etc.
   */
  listUser: AuthorizedPost<{}, PublicUserData[]>,
  /** read users own details, only the user themself can call this */
  readUser: AuthorizedPost<{userId: string}, PrivateUserData>,
  /** update users own details, only the user themself can call this */
  updateUser: AuthorizedPost<UdpateUserData, PrivateUserData>,

}

/**
 * Endpoints related to authenticating and authorizing.
 * The have non-standard shapes and are dealt with by custom code.
 * Only infrastructure code needs to use these.
 */
export type AuthApi = {
  /**
   * Authorize the user's access to the app based on idToken and
   * issue an accessToken that must be passed when making access-restricted
   * API calls.
   */
  authorize: (idToken: string) => Promise<AuthorizeUserResponse>,
  /**
   * Used to bootstrap the client app, initially for config needed to
   * authenticate against the ID-Provider (Cognito).
   */
  readConfig: () => Promise<ServerInfo>,
}


/**
 * The token will conform to standard JWT claims (`exp`, etc.) and will 
 * also contain claims defined in AuthzTokenPayload.
 */
export type AuthorizeUserResponse = {
  succeeded: true,
  accessToken: string,
} | {
  succeeded: false,
  message: string,
}

/** Specifies he shape of our claims in the AccessToken. */
export interface AuthzTokenPayload {
  userId: string,
  email: string,
  /* role in access token is for client's convenience, actual authz checks 
  should be done against the DB, not the claim.
  Not even using it at the moment. */
  role: string,
  userCreated: Date,
}

/* There are many "shapes" of user data:
- ServerUser - the database model, for use on the server only, should never be 
  sent to the client
- PublicUserData - can be seen by any user of the system about anyone
- PrivateUserData - should be seen only by the user themself (or an admin).
  This is tricky to enforce, because PrivateUser and ServerUser have such 
  similar shape, given Typescript's structural typing it's easy to accidentally 
  send Server data to the client.  In a real app, I'd likely separate this 
  stuff out to a composed structured designed to avoid this.
- AuthzTokenPayload - used in the claims of the "Access Token", don't be tempted
  to put non-auth stuff in here (like "display name"). You don't want to start
  thinking about tracking/refreshing stale claims. Instead, compose a proper 
  client-side model that you can track and keep up to date (with Contexts or 
  Redux or w/e).      
 */

/** This is for use on an individual client where user has signed-in.
 * Don't return this type from APIs where one user is looking
 * at other users data (like `listPublic()`).
 */
export interface PrivateUserData {
  userId: string,
  email: string,
  displayName?: string,
  publicMessage?: string,
  privateMessage?: string,
}

export type UdpateUserData = Pick<PrivateUserData, 
  "userId"|"displayName"|"publicMessage"|"privateMessage" >;

/** This is data that users are allowed to see about other users.
 */
export interface PublicUserData {
  userId: string,
  displayName?: string,
  publicMessage?: string,
  userCreated: Date,
}

/** requested by the client app so it knows how to authenticate, etc. */
export interface ServerInfo {
  cognito: CognitoConfig,
  directAuthn: {
    github: {
      clientId: string,
    }
    google: {
      issuer: string,
      clientId: string,
    },
    facebook: {
      issuer: string,
      clientId: string,
    },
    twitter: {
      issuer: string,
    },
    aaf: {
      issuer: string,
      clientId: string,
    },
  }
  lambdaCreateDate: Date,
}

/* These "config" types model the server-side config that needs to be known by 
the client.  It' a subset of the information used to configure the server-side. 
The server-side code must be careful to only pass newly constructed objects to
pass back to the client. This is to avoid accidentally passing server-side data 
to clients. */

/** This is the stuff the client needs to know to do direct authentication;
 client must not see the secret, and doesn't care about the
 allowedCallbackUrls.
 */
export const DirectOAuthConfig = zod.object({
  issuer: zod.string().url(),
  clientId: zod.string(),
});
export type DirectOAuthConfig = zod.infer<typeof DirectOAuthConfig>;

export const CognitoEmailConfig = zod.object({
  userPoolId: zod.string(),
  userPoolClientId: zod.string(),
});
export type CognitoEmailConfig = zod.infer<typeof CognitoEmailConfig>;

export const CognitoUserPoolConfig = zod.object({
  userPoolId: zod.string(),
  userPoolClientId: zod.string(),
  userPoolDomain: zod.string(),
});
export type CognitoUserPoolConfig = zod.infer<typeof CognitoUserPoolConfig>;

export const CognitoConfig = zod.object({
  region: zod.string(),
  email: CognitoEmailConfig,
  google: CognitoUserPoolConfig,
  github: CognitoUserPoolConfig,
});
export type CognitoConfig = zod.infer<typeof CognitoConfig>;

/** We need a client-driven redirectUri so we can use the same lambda for 
different clients (think: localhost for dev, TST and PRD environments. 
Can avoid this by using multiple authn APIs, one per environment (e.g. similar
to what Github does where you can only have one /idpresponse callback URL 
per client). */
export const ZincOAuthState = zod.object({
  redirectUri: zod.string(),
});
export type ZincOAuthState = zod.infer<typeof ZincOAuthState>;

