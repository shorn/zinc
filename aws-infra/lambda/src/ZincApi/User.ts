import { guardAuthz, guardCrossAccountUpdate } from "ZincApi/Authz/GuardAuthz";
import { mapToPrivateUser } from "Db/UserTableV1Db";
import {
  PrivateUserData,
  PublicUserData,
  UdpateUserData
} from "Shared/ApiTypes";
import { ZincApiRuntime } from "ZincApi/ZincApiHandler";

export async function listPublicUserData(
  req: {},
  config: ZincApiRuntime,
  accessToken: string,
): Promise<PublicUserData[]>{
  await guardAuthz(config, accessToken);
  return config.database.listAllUsers();
}

export async function readUser(
  req: {userId: string}, 
  config: ZincApiRuntime, 
  accessToken: string
): Promise<PrivateUserData>{
  const authz = await guardAuthz(config, accessToken);
  guardCrossAccountUpdate(authz, req.userId);
  
  const user = await config.database.getServerUser(req.userId);
  if( !user ){
    throw new Error("cannot read user: "+req.userId);
  }
  
  return mapToPrivateUser(user);
}

/**
 * This is intended for the user themself to update their data, so it's
 * limited to only being called by themselves (and maybe admin role one day).
 * Must not allow updating of security orienteted fields, like
 * userId, email, denyAuthBefore, etc.
 */
export async function updateUser(
  req: UdpateUserData,
  config: ZincApiRuntime,
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


