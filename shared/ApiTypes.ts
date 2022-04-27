/*
 note the `accessToken` is "out of band", it is transferred in the auth header
 and handled on both client and server by infrastructure rather than the
 application/business logic.
 It's modelled here as optional so that:
 - client code can call it without passing the token and the infrastructure
   will take care of putting the token into the auth header 
 - server code can read the token from the auth header and bind it in when
   it calls the implementation function 
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


//export interface AuthorizeUserRequest {
//  idToken: string,
//}

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
  lambdaCreateDate: Date,
}

export interface CognitoEmailConfig {
  userPoolId: string,
  userPoolClientId: string,
}

export interface CognitoGoogleConfig {
  userPoolId: string,
  userPoolClientId: string,
  userPoolDomain: string,
}

/** must not contain secrets */
export interface CognitoConfig {
  region: string,
  email: CognitoEmailConfig,
  google: CognitoGoogleConfig,
}


