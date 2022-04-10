import { SignUpResponse, SignUpUserRequest } from "shared/ApiTypes";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { AuthError, forceError } from "Util/Error";
import { AuthUserConfig } from "AuthUser";
import { addUser, findUser } from "Db/LambdaDb";

export async function signUpUser(
  req: SignUpUserRequest,
  config: AuthUserConfig
): Promise<SignUpResponse>{
  console.log("verifying", req.idToken);

  let payload: JwtPayload;
  try {
    payload = await config.verifier.google.verify(req.idToken);
  } catch( err ){
    throw new AuthError({publicMsg: "while verifying",
      privateMsg: forceError(err).message });
  }

  console.log("Token is valid. Payload:", payload);

  if( !payload.email || typeof (payload.email) !== "string" ){
    throw new Error("payload.email invalid");
  }
  const userEmail: string = payload.email;

  let existingUser = await findUser(userEmail);
  if( existingUser ){
    console.log("user already exists", existingUser);
    return {user: existingUser};
  }

  const user = await addUser(userEmail);
  return {user};
}
