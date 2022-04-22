import { AuthorizeUserRequest, AuthorizeUserResponse } from "shared/ApiTypes";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { AuthError, forceError } from "Util/Error";
import { initialParamValue } from "../../../src/Stack/CredentialSsmStackV3";
import { signAuthzToken } from "Authz/AuthzToken";
import { CognitoVerifierProps, LambaApiV2Config } from "LambdaApiV2";
import { decode } from "jsonwebtoken";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";

const oneDaySeconds = 1 * 24 * 60 * 60;
const tenMinutesSeconds = 10 * 60;
const accessTokenLifeSeconds = oneDaySeconds;

type CognitoPocIdToken = JwtPayload & {sub: string, email: string};

/** Turns an IdToken into an AccessToken */
export async function authorizeUser(
  idToken: string,
  config: LambaApiV2Config, 
): Promise<AuthorizeUserResponse>{
  // verify signature of token and shape of payload
  const payload: CognitoPocIdToken = 
    await verifyCognitoIdToken(idToken, config);
  const userId: string = payload.sub;
  const userEmail: string = payload.email;

  /* We use the cognito `subject` (AKA "user name") as our userId - it is not 
  PII. I believe these are UUID values (not sure of the flavour) and are 
  intended to be globally unique. If Cognito assigns the same `subject` to two
  different principles across our user pools - that that would result in 
  undesirable behaviour (user-A sees user-B's data). */
  let user = await config.database.getUser(userId);

  if( !user ){
    /* there's no signup flow or authorization process, if a user wants to use 
    the PoC and we've been able to identify them - automatically add them. */
    user = await config.database.addUser({userId, email: userEmail});
  }

  /* TODO:STO `onlyAfter` we want to be able to disable users out, and want to
   be able to expire their tokens - instead of maintaining a blacklist, we use
   a timestamp.  This is useful for a few different things:
   - defense against security wonkism - the longer you set the accessToken 
   validity, the more important this becomes
   - "log out of all devices" functionality
   - temporary lock out of all/most users 
   The "enabled" flag 
  */

  //if( !user.enabled ){
  //  throw new AuthError({publicMsg: "while authorizing",
  //    privateMsg: "user disabled" });
  //}
  //if( user.onlyAfter ){
  //  if( user.onlyAfter.getTime() > new Date().getTime() ){
  //    throw new AuthError({publicMsg: "while authorizing",
  //      privateMsg: "authz only allowed after: " +
  //        user.onlyAfter.toISOString() });
  //  }
  //}

  console.log("idToken and User is valid, generating accessToken");

  // why is this here? should be in the initial config init?
  const {authzSecrets} = config;
  if( !authzSecrets || authzSecrets.length === 0 ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "no authzSecrets defined" });
  }

  if( authzSecrets[0].length <= initialParamValue.length ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "authzSecret[0] is too short, pick a better value" });
  }

  const accessToken = signAuthzToken({
    payload: {
      userId,
      email: user.email,
      userCreated: user.created,
      role: "user" // not used yet
    },
    secret: authzSecrets[0],
    expiresInSeconds: accessTokenLifeSeconds });

  return {
    succeeded: true,
    accessToken,
  }
}

function isCognitoPocIdToken(payload: JwtPayload): payload is CognitoPocIdToken{
  if( !payload.sub || typeof (payload.sub) !== "string" ){
    return false;
  }

  if( !payload.email || typeof (payload.email) !== "string" ){
    return false;
  }

  return true;
}

/** verfies the idToken against the relvant Cognito user pool, depending on 
 * the intended `audience` of the token. 
 */
async function verifyCognitoIdToken(
  idToken: string,
  config: LambaApiV2Config,
): Promise<CognitoPocIdToken>{
  /* used to dig out the `aud` claim to decide which pool to verify against,
   but the token itself is NOT verified */
  const decoded = decode(idToken) as JwtPayload;
  console.log("authorize decode", decoded);
  
  let payload: JwtPayload;
  if( decoded.aud === config.cognito.google.userPoolClientId ){
    try {
      payload = await config.verifier.google.verify(idToken);
    } catch( err ){
      throw new AuthError({publicMsg: "while verifying google cognito",
        privateMsg: forceError(err).message });
    }
  }
  else if( decoded.aud === config.cognito.email.userPoolClientId ){
    try {
      payload = await config.verifier.email.verify(idToken);
    } catch( err ){
      throw new AuthError({publicMsg: "while verifying email cognito",
        privateMsg: forceError(err).message });
    }
  }
  else {
    console.error("unknown JWT [aud]", decoded);
    throw new AuthError({publicMsg:"while authorizing",
      privateMsg: "unknown JWT [aud]" + decoded.aud});
  }

  if( !isCognitoPocIdToken(payload) ){
    console.error("idToken payload is wrong shape", decoded);
    throw new AuthError({publicMsg:"while authorizing",
      privateMsg: "unknown JWT [aud]" + decoded.aud});
  }

  return payload;
}
