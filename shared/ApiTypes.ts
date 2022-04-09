export type ApiRequest = {
  type: "SignUpUser",
  payload: SignUpUserRequest,
} | {
  type: "Authorize",
  payload: AuthorizationRequest,
} | {
  type: "ListUsers",
  payload: AuthorizedRequest,
} | {
  type: "ReloadConfig",
} | {
  type: "ReadConfig",
} | {
  type: "KeepAlive",
}

export interface SignUpUserRequest {
  idToken: string,
}

// used to authorize the idToken and get an accessToken
export interface AuthorizationRequest {
  idToken: string,
}

// used in the payload of any "authorized" call, each call must
// verify the access token
export interface AuthorizedRequest {
  accessToken: string,
}


export type AuthorizeResponse = {
  succeeded: true,
  accessToken: string,
} | {
  succeeded: false,
  message: string,
}

export interface SignUpResponse {
  user: User,
}

export interface User {
  email: string,
  enabled: boolean,
  onlyAfter?: Date,
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
  email: string,
  /* role in access token is for client's convenience, actual authz checks 
  should be done against the DB, not the claim.
  Not even using it at the moment. */
  role: string,
}