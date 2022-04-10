// this is bad, don't leak emails like this
import { AuthorizedRequest, User } from "shared/ApiTypes";
import { AuthUserConfig } from "AuthUser";
import { listUsers } from "Db/LambdaDb";
import { guardAuthz } from "Api/Authz";

export async function listPublicUserData(
  req: AuthorizedRequest,
  config: AuthUserConfig): Promise<User[]>
{
  await guardAuthz(req, config);
  return listUsers();
}
