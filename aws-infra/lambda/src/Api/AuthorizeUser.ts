import {
  AuthorizationRequest,
  AuthorizeResponse
} from "shared/ApiTypes";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { AuthError, forceError } from "Util/Error";
import { initialParamValue } from "../../../src/Stack/CredentialSsmStack";
import { signAuthzToken } from "Jwt/AuthzToken";
import { AuthUserConfig } from "AuthUserDb";
import { addUser, findUser } from "Db/LambdaDb";

const accessTokenLifeSeconds = 1 * 24 * 60 * 60;

/** Turns an IdToken into an AccessToken */
export async function authorizeUser(
  req: AuthorizationRequest,
  config: AuthUserConfig
): Promise<AuthorizeResponse>{
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

  if( !payload.email || typeof (payload.email) !== "string" ){
    throw new AuthError({publicMsg: "while verifying",
      privateMsg: "payload.email invalid" });
  }
  const userEmail: string = payload.email;

  let user = await findUser(userEmail);

  if( !user ){
    // no sign up button for Google, just add them
    user = await addUser(userEmail);
  }

  if( !user.enabled ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "user disabled" });
  }
  if( user.onlyAfter ){
    if( user.onlyAfter.getTime() > new Date().getTime() ){
      throw new AuthError({publicMsg: "while authorizing",
        privateMsg: "authz only allowed after: " +
          user.onlyAfter.toISOString() });
    }
  }

  console.log("User is valid, generation access token");

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
    email: user.email,
    secret: authzSecrets[0],
    expiresInSeconds: accessTokenLifeSeconds });

  return {
    succeeded: true,
    accessToken,
  }
}
