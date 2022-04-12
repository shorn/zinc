import { SignUpResponse, SignUpUserRequest } from "shared/ApiTypes";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import { AuthError, forceError } from "Util/Error";
import { LambaApiV2Config } from "LambdaApiV2";

export async function signUpUser(
  req: SignUpUserRequest,
  config: LambaApiV2Config
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

  if( !payload.userId || typeof (payload.userId) !== "string" ){
    console.error("malformed AuthzToken.userId", payload);
    throw new Error("payload.userId invalid");
  }
  if( !payload.email || typeof (payload.email) !== "string" ){
    throw new Error("payload.email invalid");
  }

  let existingUser = await config.database.getUser(payload.userId);
  if( existingUser ){
    console.log("user already exists", existingUser);
    return {user: existingUser};
  }

  const user = await config.database.addUser({
    userId: payload.userId, 
    email: payload.email });
  return {user};
}
