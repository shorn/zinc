import { AuthorizedRequest, User } from "shared/ApiTypes";
import { guardAuthz } from "Api/Authz";
import { LambaApiV2Config } from "LambdaApiV2";

// this is bad, don't leak emails like this
export async function listPublicUserData(
  req: AuthorizedRequest,
  config: LambaApiV2Config): Promise<User[]>
{
  await guardAuthz(req, config);
  return config.database.listAllUsers();
}
