import {
  AuthorizeUserResponse,
  AuthzTokenPayload,
  CognitoConfig
} from "Shared/ApiTypes";
import jwtDecode from "jwt-decode";
import { parseJwtDate, parseServerDate } from "Util/DateUtil";
import { ErrorInfo, forceError } from "Error/ErrorUtil";
import { AuthorizedSession } from "Auth/AuthProvider";
import {
  CognitoUserPool,
  CognitoUserSession
} from "amazon-cognito-identity-js";
import { authApi } from "Api/AuthApi";

const accessTokenStorageKey = "zincAccessToken";

function debugAuthzResponse(auth: AuthorizeUserResponse){
  if( !auth.succeeded ){
    return "failed";
  }
  
  return "succeeded - " + auth.accessToken.slice(-10); 
}

export async function authorizeWithServer(idToken: string)
: Promise<ErrorInfo|AuthorizedSession>{
  let authzResponse: AuthorizeUserResponse;
  try {
    authzResponse = await authApi.authorize(idToken);
  }
  catch( err ){
    return {
      message: forceError(err).message,
      problem: err,
    };
  }
  console.log("authzResponse", debugAuthzResponse(authzResponse));

  if( !authzResponse.succeeded ){
    return {
      message: authzResponse.message,
      problem: authzResponse
    };
  }

  const parseResult = parseAccessToken(authzResponse.accessToken);
  if( !parseResult.succeeded ){
    return {
      message: parseResult.message,
      problem: parseResult.decoded
    };
  }

  localStorage.setItem(accessTokenStorageKey, authzResponse.accessToken);

  return {
    accessToken: authzResponse.accessToken,
    accessTokenExpiry: parseResult.accessTokenExpiry,
    payload: parseResult.payload,
  };

}

export function clearAccessTokenFromStorage(){
  localStorage.removeItem(accessTokenStorageKey);
}

export function getAuthSessionFromStorage(): undefined | AuthorizedSession{
  const storedAccessToken = localStorage.getItem(accessTokenStorageKey);

  if( !storedAccessToken ){
    return undefined;
  }
  
  const parseResult = parseAccessToken(storedAccessToken);
  if( !parseResult.succeeded ){
    console.warn("problem parsing accessToken from storage, ignoring",
      parseResult.message, parseResult.decoded);
    return undefined;
  }

  return {
    accessToken: storedAccessToken,
    accessTokenExpiry: parseResult.accessTokenExpiry,
    payload: parseResult.payload
  };
}

export function parseAccessToken(accessToken: string):{
  succeeded: true,
  accessTokenExpiry: Date,
  payload: AuthzTokenPayload,
} | {
  succeeded: false,
  message: string,
  decoded: string|undefined,
}{
  const decoded: any = jwtDecode(accessToken);

  if( !decoded ){
    return {succeeded: false, message: "accessToken decode issue", decoded};
  }

  if( typeof decoded !== "object" ){
    return {succeeded: false, message: "decoded token is not object", decoded};
  }

  if( !decoded.userId || typeof(decoded.userId) !== "string" ){
    return {succeeded: false, 
      message: "no accessToken payload userId", decoded};
  }

  if( !decoded.email  || typeof(decoded.email) !== "string" ){
    return {succeeded: false, message: "no accessToken payload email", decoded};
  }

  if( !decoded.role  || typeof(decoded.role) !== "string" ){
    return {succeeded: false, message: "no accessToken payload role", decoded};
  }

  if( !decoded.userCreated  || typeof(decoded.userCreated) !== "string" ){
    return {succeeded: false, 
      message: "no accessToken payload userCreated", decoded};
  }

  if( !decoded.exp || typeof(decoded.exp) !== "number" ){
    return {succeeded: false, 
      message: "malformed accessToken payload exp", decoded};
  }

  const accessTokenExpiry: Date|undefined = parseJwtDate(decoded.exp);
  if( !accessTokenExpiry ){
    return {succeeded: false, 
      message: "malformed accessToken payload exp", decoded};
  }

  if( accessTokenExpiry <= new Date() ){
    console.warn("accessTokenExpiry", accessTokenExpiry);
    return {succeeded: false, message: "accessToken is expired", decoded};
  }

  return {
    succeeded: true,
    accessTokenExpiry,
    payload: {
      ...decoded,
      /* date needs to be converted since it was decoded from a JWT, not passed
      through our API parsing routine. */
      userCreated: parseServerDate(decoded.userCreated)
    },
  }
}

export function debugSession(session: CognitoUserSession){
  const idToken = session.getIdToken();
  const payload = idToken.payload;
  console.log(idToken.getJwtToken());
  console.debug("idToken", {
    exp: parseJwtDate(payload.exp),
    iat: parseJwtDate(payload.iat),
    auth_time: parseJwtDate(payload.auth_time),
  })
}

export async function signOutUser({cognito}: {
  cognito: CognitoConfig,
}): Promise<void>{
  clearAccessTokenFromStorage();

  /* call signOut() to clean up the client side pools - e.g. email user pool 
  sticks stuff in local storage and our login logic would pick up that 
  "signed-in" state if we didn't get rid of it.
  Note sure if social provides need sign-out, but might as well. */
  await signOutPools(cognito);
}

async function signOutPools(cognito: CognitoConfig){
  console.log("signing out from all cognito pools");

  const emailPool = new CognitoUserPool({
    UserPoolId: cognito.email.userPoolId,
    ClientId: cognito.email.userPoolClientId,
  });
  const googlePool = new CognitoUserPool({
    UserPoolId: cognito.google.userPoolId,
    ClientId: cognito.google.userPoolClientId,
  });
  const githubPool = new CognitoUserPool({
    UserPoolId: cognito.github.userPoolId,
    ClientId: cognito.github.userPoolClientId,
  });

  await signOutCurrentUser(emailPool, "email");
  await signOutCurrentUser(googlePool, "google");
  await signOutCurrentUser(githubPool, "github");
}

/**
 * This never resolves if Cognito doesn't invoke the callback, might need a 
 * timeout.
 */
function signOutCurrentUser(pool: CognitoUserPool, name: string): Promise<void>{
  const currentUser = pool.getCurrentUser();
  if( !currentUser ){
    console.log(`signOutCurrentUser() - no currentUser for ${name}`);
    return Promise.resolve();
  }

  console.log(`signOutCurrentUser() - signing out from ${name}`);
  return new Promise((resolve) => {
    currentUser.signOut(() => {
      console.log(`signOutCurrentUser() - signed out from ${name}`);
      return resolve();
    });  
  });  
}

