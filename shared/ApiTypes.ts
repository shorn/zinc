
/**
 * This type has two implementations: server and client.
 */
export type ApiMap = {
  /**
   * Authorize the user's access to the app based on idToken and
   * issue an accessToken that must be passed when making access-restricted
   * API calls.
   */
  authorize: {
    post: (req: {}, idToken: string) => 
      Promise<AuthorizeUserResponse>
  },
  /**
   * Used to bootstrap the client app, initially for config needed to
   * authenticate against the ID-Provider (Cognito).
   */
  readConfig: {
    post: (req: {}) => Promise<ServerInfo>
  },
  /**
   * list publicly available data for all users.
   */
  listUsers: {
    post: (req: {}, accessToken?: string) => 
      Promise<PublicUserData[]>
  },
}

export interface AuthorizeUserRequest {
  idToken: string,
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


