export type ApiCall = {
  type: string
}

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
    post: (req: AuthorizeUserRequest) => Promise<AuthorizeUserResponse>
  },
  /**
   * Used to bootstrap the client app, initially for config needed to
   * authenticate against the ID-Provider (Cognito).
   */
  readConfig: {
    post: () => Promise<ServerInfo>
  },
  /**
   * Deprecated, was used to force a lambda reload.
   */
  initConfig: {
    post: () => Promise<CognitoConfig>
  },
  /**
   * list publicly available data for all users.
   */
  listUsers: {
    post: (req: AuthorizedRequest) => Promise<PublicUserData[]>
  },
}

export interface AuthorizeUserRequest {
  idToken: string,
}


export type AuthorizeUserResponse = {
  succeeded: true,
  accessToken: string,
} | {
  succeeded: false,
  message: string,
}

/**
 * used in the payload of any "authorized" call, each call must
 * verify the access token on the server-side.
 */
export interface AuthorizedRequest {
  accessToken: string,
}

/** This is for user by an individual client on that user's signed-in browser.
 * Don't return this type from APIs where you're looking one user is looking
 * at other users data (like listPuclic).
 */
export interface User {
  userId: string,
  email: string,
  displayName?: string,
  publicMessage?: string,
  //enabled: boolean,
  //onlyAfter?: Date,
}

/** This is data where we don't mind if non-users see this data.
 */
export interface PublicUserData {
  userId: string,
  displayName?: string,
  publicMessage?: string,
  userCreated: Date,
}

export interface ServerInfo {
  cognito: CognitoConfig,
  lambdaCreateDate: Date,
}


/** must not contain secrets */
export interface CognitoConfig {
  region: string,
  //email: {
  //  userPoolId: string,
  //  userPoolClientId: string,
  //},
  google: {
    userPoolId: string,
    userPoolClientId: string,
    userPoolDomain: string,
  },
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

export interface SignUpUserRequest {
  idToken: string,
}

export interface SignUpResponse {
  user: User,
}

