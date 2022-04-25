import { PublicUserData } from "shared/ApiTypes";
import { guardAuthz } from "Api/Authz";
import { LambaApiV2Config } from "LambdaApiV2";

export async function listPublicUserData(
  req: {},
  config: LambaApiV2Config,
  accessToken?: string,
): Promise<PublicUserData[]>{
  await guardAuthz(config, accessToken);
  return config.database.listAllUsers();
}
