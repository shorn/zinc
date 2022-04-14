import { AuthorizedRequest, AuthzTokenPayload } from "shared/ApiTypes";
import { verifyAuthzToken } from "Authz/AuthzToken";
import { AuthError } from "Util/Error";
import { LambaApiV2Config, ServerAuthzContainer } from "LambdaApiV2";

/** Verify the AccessToken sent by the client, verify the user is still allowed
 * to use the API.
 * Called by endpoints that restrict access.
 * @throws AuthError if there's an issue with token or access verification.
 */
export async function guardAuthz(config: LambaApiV2Config, accessToken?: string)
  : Promise<ServerAuthzContainer>{
  console.log("verifying", accessToken);

  if( !accessToken ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: `no accessToken found`  });
  }
  
  const auth: AuthzTokenPayload = verifyAuthzToken({
    accessToken,
    secrets: config.authzSecrets });

  const userId: string = auth.userId;

  let user = await config.database.getUser(userId);

  if( !user ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: `no such user: ${userId} - ${auth.email}`  });
  }

  //if( !user.enabled ){
  //  throw new AuthError({publicMsg: "while authorizing",
  //    privateMsg: "user disabled" });
  //}
  //
  //if( user.onlyAfter ){
  //  if( user.onlyAfter.getTime() > new Date().getTime() ){
  //    throw new AuthError({publicMsg: "while authorizing",
  //      privateMsg: "authz only allowed after: " +
  //        user.onlyAfter.toISOString() });
  //  }
  //}

  return {
    access: auth,
    user
  };
}
