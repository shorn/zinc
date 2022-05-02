import {
  CognitoIdToken,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession
} from "amazon-cognito-identity-js";
import {
  CognitoConfig,
  CognitoEmailConfig,
  CognitoUserPoolConfig
} from "shared";
import { forceError } from "Error/ErrorUtil";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";

/** no logic, just a helper for turning callback into promise */
export function getCognitoUserSession(
  user: CognitoUser
): Promise<CognitoUserSession | undefined>{
  return new Promise<CognitoUserSession | undefined>((resolve, reject) => {
    user.getSession((
      error: null | Error,
      session: null | CognitoUserSession,
    ) => {
      if( error ){
        reject(error);
        return;
      }

      if( session == null ){
        resolve(undefined);
        return;
      }

      resolve(session);

    });
  });
}

export async function getEmailCognitoIdToken(
  config: CognitoEmailConfig,
): Promise<CognitoIdToken|undefined>{

  const emailPool = new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.userPoolClientId,
  });
  
  const emailUser = emailPool.getCurrentUser();
  
  if( !emailUser ){
    console.log("no email user returned from pool");
    return undefined;
  }
  
  let session: CognitoUserSession | undefined;
  try {
    session = await getCognitoUserSession(emailUser);
  }
  catch( error ){
    console.warn("problem calling email getSession()",
      forceError(error).message);
    return undefined;
  }

  if( !session ){
    return undefined;
  }

  if( !session.getIdToken() ){
    console.warn("email getSession() returned session with no idToken",
      session);
    return undefined;
  }

  return session.getIdToken();
}

export function getSocialRedirectIdToken(): string|undefined{
  const parsedHash = new URLSearchParams(
    window.location.hash.substring(1) // skip the first char (#)
  );

  let idToken = parsedHash.get("id_token");
  if( !idToken ){
    return undefined;
  }

  // don't leave stuff (tokens, params, etc.) in the url after a SSO redirect
  window.location.hash = "";
  
  return idToken;
}

export async function findSignInIdToken(
  cognito: CognitoConfig
):Promise<string | undefined>{
  let idToken:string|undefined = getSocialRedirectIdToken();
  if( idToken ){
    console.log("found social idToken", idToken);
    return idToken;
  }

  idToken = (await getEmailCognitoIdToken(cognito.email))?.getJwtToken();
  if( idToken ){
    console.log("found email idToken");
    return idToken;
  }

  console.log("found no idToken");
  return undefined;
}

export function getCognitoUserPoolUrl(userPoolDomain: string, region: string){
  return `https://${userPoolDomain}.auth.${region}.amazoncognito.com`
}

export function formatCognitoIdProviderRedirect(
  config: CognitoUserPoolConfig, 
  region: string
): string{
  const redirectUri = serverLocationUrl();
  const poolUrl = getCognitoUserPoolUrl(
    config.userPoolDomain, region );
  return `${poolUrl}/login?response_type=token` +
    `&client_id=${config.userPoolClientId}` +
    `&redirect_uri=${redirectUri}`
}