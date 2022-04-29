import { JwtPayload, sign, SignOptions, verify } from "jsonwebtoken";
import { forceError } from "Util/Error";
import { AuthzTokenPayload } from "../../../../shared/ApiTypes";

const authzOptions: SignOptions = {
  algorithm: "HS256",
  /* pretty non-standard values, but it's really just an opaque bearer token,
  so we don't need to worry about this too much. 
  Put URLs to the lamda function that issues, cloudfront url etc. if you 
  really want. */
  issuer: "zinc-poc authz",
  audience: "zinc client",
} 
  
export function verifyAuthzToken({accessToken, secrets}: {
  accessToken: string,
  secrets: string[]
}): JwtPayload & AuthzTokenPayload {
  if( !secrets || secrets.length < 1 ){
    throw new Error("malformed secrets array");
  }
  
  // latest secret always goes in [0], so this only uses more CPU while clients
  //are still using tokens signed with old secret
  const failedAttempts: string[] = [];
  for (let i = 0; i < secrets.length; i++) {
    const result = attemptAuthzTokenVerify({accessToken, secret: secrets[i]});
    if( result.succeeded ){
      return result.payload;
    }
    failedAttempts.push(result.problem);
  }
  
  console.error("failed authz verification: " + failedAttempts.join("|"));
  throw new Error("failed AuthzToken verification");
}

export type AuthzTokenVerificationAttempt = {
  succeeded: true,
  payload: JwtPayload & AuthzTokenPayload,
} |{
  succeeded: false,
  problem: string,
}

function attemptAuthzTokenVerify({accessToken, secret}:{
  accessToken: string,
  secret: string,
}): AuthzTokenVerificationAttempt {
  let result: string | JwtPayload;
  try {
    result = verify(accessToken, secret, {
      ...authzOptions,
    });
  }
  catch( err ){
    return {succeeded: false, problem: forceError(err).message};
  }

  if( typeof(result) === 'string' ){
    return {succeeded: false, problem: result};
  }

  if( !result.userId || typeof (result.userId) !== "string" ){
    console.error("malformed AuthzToken.userId", result);
    return {succeeded: false, problem: "malformed AuthzToken.userId"};
  }
  
  if( !result.email || typeof (result.email) !== "string" ){
    console.error("malformed AuthzToken.email", result);
    return {succeeded: false, problem: "malformed AuthzToken.email"};
  }
  
  if( !result.role || typeof (result.role) !== "string" ){
    console.error("malformed AuthzToken.role", result);
    return {succeeded: false, problem: "malformed AuthzToken.role"};
  }
  
  return {succeeded: true, payload: result as JwtPayload & AuthzTokenPayload};
}

export function signAuthzToken({payload, secret, expiresInSeconds}: {
  payload: AuthzTokenPayload,
  secret: string,
  expiresInSeconds: number,
}): string{
  return sign(
    payload,
    secret,
    {...authzOptions, expiresIn: expiresInSeconds},
  );
}