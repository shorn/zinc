import { AuthzTokenPayload } from "shared/ApiTypes";
import { verifyAuthzToken } from "Authz/AuthzToken";
import { AuthError } from "Util/Error";
import { LambaApiV2Config } from "LambdaApiV2";
import { ServerUser } from "Db/UserTableV1Db";
import { initialParamValue } from "../../../src/Stack/CredentialSsmStackV3";

export const GENERIC_DENIAL = "while authorizing";

export interface ServerAuthzContainer {
  access: AuthzTokenPayload,
  user: ServerUser,
}

/** Guard that the token is valid and obeys appliction access restrictions, 
 * called by endpoints that restrict access to users.
 * Verify the AccessToken sent by the client, verify the user is still allowed
 * to use the API.
 * 
 * @return parsed token and user data so that endpoint can make further authz
 * logic decisions
 * 
 * @throws AuthError if there's any reason why the user should not be allowed 
 * to proceeed:
 * - could be generic "business logic" access rules, like the user 
 *   no longer satisfies the "application authz" rules (we've disabled them, 
 *   or set the `denyAuthBefore` field and this token is too old) 
 * - could be "technical logic" with the token itself (token expired, 
 *   or invalid signature).
 */
export async function guardAuthz(
  config: LambaApiV2Config, 
  accessToken?: string
): Promise<ServerAuthzContainer>{
  console.log("verifying", accessToken);

  if( !accessToken ){
    throw new AuthError({publicMsg: GENERIC_DENIAL,
      privateMsg: `no accessToken found`  });
  }
  
  const auth: AuthzTokenPayload = verifyAuthzToken({
    accessToken,
    secrets: config.authzSecrets });

  const userId: string = auth.userId;

  let user = await config.database.getServerUser(userId);

  if( !user ){
    throw new AuthError({publicMsg: GENERIC_DENIAL,
      privateMsg: `no such user: ${userId} - ${auth.email}`  });
  }

  guardGenericAuthz(user);

  return {
    access: auth,
    user
  };
}

/** Guard generic appplication access rules.
 * @throws AuthError if there's any reason why the user should not be allowed
 * to proceeed, e.g.:
 * - we've disabled them
 * - the `denyAuthBefore` field is set and this token is too old)
 */
export function guardGenericAuthz(user: ServerUser): void {
  /* `denyAuthBefore`: we want to be able to disable users out, and want to
   be able to expire their tokens - instead of maintaining a token blacklist, 
   we use a per-user timestamp.  
   This is useful for a few different things:
   - defense against security wonkism - the longer you set the accessToken 
   validity, the more important this becomes until it's no longer wonkism
   - "log out of all devices" functionality
   - temporary lock out of all/most users 
   The "enabled" flag is more of a binary "user is no longer active" flag, 
   intended for higher level "business logic" related activities. 
  */
  
  if( !user.enabled ){
    throw new AuthError({publicMsg: GENERIC_DENIAL,
      privateMsg: "user disabled" });
  }
  if( user.denyAuthBefore ){
    if( user.denyAuthBefore.getTime() > new Date().getTime() ){
      throw new AuthError({publicMsg: GENERIC_DENIAL,
        privateMsg: "authz only allowed after: " +
          user.denyAuthBefore.toISOString() });
    }
  }
}

/**
 * @throws AuthError if requested user is not the same as the authorized user.
 */
export function guardCrossAccountUpdate(
  authz: ServerAuthzContainer,
  updateUserId: string
){
  if( authz.user.userId !== updateUserId ){
    console.error("user tried to update other user", authz.user, updateUserId);
    throw new AuthError({publicMsg: GENERIC_DENIAL,
      privateMsg: "cross-account update requested"})
  }
}

/**
 * Always uses the first entry to sign.
 * @throws AuthError if the secrets array is not suitable
 */
export function getAuthzSigningSecret(authzSecrets: string[]): string{
  if( !authzSecrets || authzSecrets.length === 0 ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "no authzSecrets defined" });
  }

  if( authzSecrets[0].length <= initialParamValue.length ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "authzSecret[0] is too short, pick a better value" });
  }
  
  return authzSecrets[0];
}

