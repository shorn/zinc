import { AuthorizedRequest, AuthzTokenPayload } from "shared/ApiTypes";
import { verifyAuthzToken } from "Jwt/AuthzToken";
import { AuthError } from "Util/Error";
import { AuthUserConfig, ServerAuthzContainer } from "AuthUser";
import { findUser } from "Db/LambdaDb";

/** Verify the AccessToken sent by the client.
 * Called by endpoints that restrict access.
 */
export async function guardAuthz(req: AuthorizedRequest, config: AuthUserConfig)
  : Promise<ServerAuthzContainer>{
  console.log("verifying", req.accessToken);

  //const decoded = decode(req.accessToken) as JwtPayload;
  //console.log("JWT expires", parseJwtDate(decoded.exp))

  const auth: AuthzTokenPayload = verifyAuthzToken({
    accessToken: req.accessToken,
    secrets: config.authzSecrets });

  const userEmail: string = auth.email;

  let user = await findUser(userEmail);

  if( !user ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "no such user: " + userEmail });
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

  return {
    access: auth,
    user
  };
}
