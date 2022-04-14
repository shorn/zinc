import { AuthorizedRequest, PublicUserData, User } from "shared/ApiTypes";
import { guardAuthz } from "Api/Authz";
import { LambaApiV2Config } from "LambdaApiV2";

export async function listPublicUserData(
  req: AuthorizedRequest,
  config: LambaApiV2Config): Promise<PublicUserData[]>
{
  await guardAuthz(req, config);
  return config.database.listAllUsers();
}
