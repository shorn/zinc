import { LambaApiV2Config } from "LambdaApiV2";
import { PrivateUserData, UdpateUserData } from "shared";
import { guardAuthz, guardCrossAccountUpdate } from "Api/Authz";
import { mapToPrivateUser } from "Db/UserTableV1Db";

/**
 * This is intended for the user themself to update their data, so it's
 * limited to only being called by themselves (and maybe admin role one day).
 * Must not allow updating of security orienteted fields, like
 * userId, email, denyAuthBefore, etc.
 */
export async function updateUser(
  req: UdpateUserData,
  config: LambaApiV2Config,
  accessToken?: string,
): Promise<PrivateUserData>{
  const {userId, ...updateProps} = req;
  const authz = await guardAuthz(config, accessToken);
  guardCrossAccountUpdate(authz, userId);
  
  const user = await config.database.getServerUser(userId);
  if( !user ){
    throw Error("update user not found: " + userId);
  }
  
  return mapToPrivateUser(
    await config.database.updateUser({...user, ...updateProps})
  );
}

