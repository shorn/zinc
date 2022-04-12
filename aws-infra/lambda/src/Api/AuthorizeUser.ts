import { AuthorizeUserRequest, AuthorizeUserResponse } from "shared/ApiTypes";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { AuthError, forceError } from "Util/Error";
import { initialParamValue } from "../../../src/Stack/CredentialSsmStackV3";
import { signAuthzToken } from "Jwt/AuthzToken";
import { LambaApiV2Config } from "LambdaApiV2";

const accessTokenLifeSeconds = 1 * 24 * 60 * 60;

/** Turns an IdToken into an AccessToken */
export async function authorizeUser(
  req: AuthorizeUserRequest,
  config: LambaApiV2Config
): Promise<AuthorizeUserResponse>{
  console.log("verifying", req.idToken);

  //const decoded = decode(req.idToken) as JwtPayload;
  //console.log("JWT expires", parseJwtDate(decoded.exp))
  let payload: JwtPayload;
  try {
    payload = await config.verifier.google.verify(req.idToken);
  } catch( err ){
    throw new AuthError({publicMsg: "while verifying",
      privateMsg: forceError(err).message });
  }

  if( !payload.sub || typeof (payload.sub) !== "string" ){
    console.error("payload.sub invalid", payload);
    throw new AuthError({publicMsg: "while verifying",
      privateMsg: "payload.sub invalid" });
  }
  const userId: string = payload.sub;
  
  if( !payload.email || typeof (payload.email) !== "string" ){
    console.error("payload.email invalid", payload);
    throw new AuthError({publicMsg: "while verifying",
      privateMsg: "payload.email invalid" });
  }
  const userEmail: string = payload.email;

  let user = await config.database.getUser(userId);

  if( !user ){
    // no sign up button for Google, just add them
    user = await config.database.addUser({userId, email: userEmail});
  }

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
    userId,
    email: user.email,
    secret: authzSecrets[0],
    expiresInSeconds: accessTokenLifeSeconds });

  return {
    succeeded: true,
    accessToken,
  }
}
