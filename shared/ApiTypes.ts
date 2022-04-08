export type ApiRequest = {
  type: "SignUpUser",
  payload: SignUpUserRequest,
} | {
  type: "Authorize",
  payload: AuthorizeRequest,
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

export interface AuthorizeRequest {
  idToken: string,
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