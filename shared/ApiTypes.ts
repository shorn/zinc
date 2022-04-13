export type ApiCall = {
  type: string
}

export type ApiMap = {
  authorize: {
    post: (req: AuthorizeUserRequest) => Promise<AuthorizeUserResponse>
  },
  readConfig: {
    post: () => Promise<ServerInfo>
  },
  initConfig: {
    post: () => Promise<CognitoConfig>
  },
  listUsers: {
    post: (req: AuthorizedRequest) => Promise<PublicUserData[]>
  },
}

// used to authorize the idToken and get an accessToken
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

// used in the payload of any "authorized" call, each call must
// verify the access token
export interface AuthorizedRequest {
  accessToken: string,
}

export interface SignUpUserRequest {
  idToken: string,
}

export interface SignUpResponse {
  user: User,
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

export interface AuthzTokenPayload {
  userId: string,
  email: string,
  /* role in access token is for client's convenience, actual authz checks 
  should be done against the DB, not the claim.
  Not even using it at the moment. */
  role: string,
  userCreated: Date,
}