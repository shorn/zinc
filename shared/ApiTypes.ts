export type ApiCall = {
  type: string
}

export type ApiMap = {
  authorize: {
    post: (req: AuthorizeUserRequest) => Promise<AuthorizeUserResponse>
  },
  readConfig: {
    post: () => Promise<CognitoConfig>
  },
  initConfig: {
    post: () => Promise<CognitoConfig>
  },
  listUsers: {
    post: (req: AuthorizedRequest) => Promise<User[]>
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

export interface User {
  userId: string,
  email: string,
  //enabled: boolean,
  //onlyAfter?: Date,
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
}