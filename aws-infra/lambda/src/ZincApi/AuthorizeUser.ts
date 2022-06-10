import { AuthorizeUserResponse } from "Shared/ApiTypes";
import { AuthError, forceError } from "Util/Error";
import { signAuthzToken } from "ZincApi/Authz/AuthzToken";
import { Algorithm, decode, JwtPayload, verify } from "jsonwebtoken";
import { GENERIC_DENIAL, guardGenericAuthz } from "ZincApi/Authz/GuardAuthz";
import { ZincApiRuntime } from "ZincApi/ZincApiHandler";

const oneDaySeconds = 1 * 24 * 60 * 60;
const tenMinutesSeconds = 10 * 60;
const accessTokenLifeSeconds = oneDaySeconds;

type CognitoPocIdToken = JwtPayload & {sub: string, email: string};

/** Exchange an OAuth/OIDC standard IdToken for an app-specific AccessToken */
export async function authorizeUser(
  idToken: string,
  config: ZincApiRuntime,
): Promise<AuthorizeUserResponse>{
  // verify signature of token and shape of payload
  const payload: CognitoPocIdToken =
    await verifyCognitoIdToken(idToken, config);
  const userId: string = payload.sub;
  const userEmail: string = payload.email;

  /* We use the cognito `subject` (AKA "user name") as our userId - it is not 
  PII. I believe these are UUID values (not sure of the flavour) and are 
  intended to be globally unique. If Cognito assigns the same `subject` to two
  different principles across our user pools - that that would result in 
  undesirable behaviour (user-A sees user-B's data). 
  For a direct login, the `subject` is the user identifier that the idprovider
  uses - i.e. authn direct with Github instead of through Cognito,
  the "subject" will be a numeric id that Github assigned to the user. */
  let user = await config.database.getServerUser(userId);

  if( !user ){
    /* there's no signup flow or authorization process, if a user wants to use 
    the PoC and we've been able to identify them - automatically add them. */
    user = await config.database.addUser({
      userId, email: userEmail, enabled: true
    });
  }

  /* all access-restricted endpoints will check at least this, no point issuing
   an accessToken that won't validate :) */
  guardGenericAuthz(user);

  console.log("idToken and User is valid, generating accessToken");


  const accessToken = signAuthzToken({
    payload: {
      userId,
      email: user.email,
      userCreated: user.created,
      role: "user" // not used yet
    },
    secret: config.authzSigningSecret,
    expiresInSeconds: accessTokenLifeSeconds
  });

  return {
    succeeded: true,
    accessToken,
  }
}

function isCognitoPocIdToken(payload: JwtPayload): payload is CognitoPocIdToken{
  if( !payload.sub || typeof (payload.sub) !== "string" ){
    return false;
  }

  if( !payload.email || typeof (payload.email) !== "string" ){
    return false;
  }

  return true;
}

/** verfies the idToken against the relvant Cognito user pool, depending on
 * the intended `audience` of the token.
 */
async function verifyCognitoIdToken(
  idToken: string,
  config: ZincApiRuntime,
): Promise<CognitoPocIdToken>{
  /* used to dig out the `aud` claim to decide which pool to verify against,
   but the token itself is NOT verified */
  const decoded = decode(idToken) as JwtPayload;
  console.log("authorize decode", decoded);

  let payload: JwtPayload;
  /* IMPROVE: it's about time to make this a map of verifier keyed by audience,
   verifier objects need to know how to do both RSA and HMAC.
   Or better; leave the Cognito verfiers the way they are, but unify all the 
   direct authentication under a "zincApi" audience secured with a single HS256
   secret. Make each direct lambda handler responsible for mapping a successful
   user authentication through to the single standard zincApi id_token. 
   Less config flying around and also more secure (zincApi lambda then wouldn't
   need to be allowed to all the direct lambda's config params. */
  if( decoded.aud === config.cognito.google.userPoolClientId ){
    try {
      payload = await config.rsaVerifier.googleCognito.verify(idToken);
      payload = await config.rsaVerifier.googleCognito.verify(idToken);
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying google cognito",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.cognito.email.userPoolClientId ){
    try {
      payload = await config.rsaVerifier.emailCognito.verify(idToken);
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying email cognito",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.cognito.github.userPoolClientId ){
    try {
      payload = await config.rsaVerifier.githubCognito.verify(idToken);
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying github cognito",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.directAuthn.github.clientId ){
    try {
      payload = await verifyGithubDirectAuthn(
        idToken, {...config.directAuthn.github} );
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying github direct",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.directAuthn.google.clientId ){
    try {
      payload = await config.rsaVerifier.googleDirect.verify(idToken);
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying google direct",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.directAuthn.facebook.clientId ){
    try {
      payload = await config.rsaVerifier.facebookDirect.verify(idToken);
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying facebook direct",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.directAuthn.twitter.twitterConsumerKey ){
    try {
      payload = await verifyTwitterDirectAuthn(
        idToken, {...config.directAuthn.twitter} );
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying twitter direct",
        privateMsg: forceError(err).message
      });
    }
  }
  else if( decoded.aud === config.directAuthn.aaf.clientId ){
    try {
      payload = await config.rsaVerifier.aafDirect.verify(idToken);
    }
    catch( err ){
      throw new AuthError({
        publicMsg: "while verifying aaf direct",
        privateMsg: forceError(err).message
      });
    }
  }
  else {
    console.error("unknown JWT [aud]: ", decoded);
    throw new AuthError({
      publicMsg: "while authorizing",
      privateMsg: "unknown JWT [aud]: " + decoded.aud
    });
  }

  if( !isCognitoPocIdToken(payload) ){
    console.error("idToken payload is wrong shape", decoded);
    throw new AuthError({
      publicMsg: "while authorizing",
      privateMsg: "unknown JWT [aud]" + decoded.aud
    });
  }

  return payload;
}

function verifyTwitterDirectAuthn(
  idToken: string, 
  config: {
    functionUrl: string,
    twitterConsumerKey: string,
    idTokenSecret: string,
  }
): JwtPayload{
  let result: string | JwtPayload;
  try {
    result = verify(
      idToken, 
      config.idTokenSecret,
      {
        algorithms: ["HS256"] as Algorithm[],
        issuer: config.functionUrl,
        audience: config.twitterConsumerKey,
      }
    );
  }
  catch( err ){
    console.log("problem verifying twitter idToken", err);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "failed direct twitter verify: " + forceError(err).message
    });
  }

  if( typeof(result) === 'string' ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "direct twitter payload was string: " + result
    });
  }

  return result;
}

function verifyGithubDirectAuthn(
  idToken: string, 
  config: {
    functionUrl: string,
    clientId: string,
    clientSecret: string,
  }
): JwtPayload{
  let result: string | JwtPayload;
  try {
    result = verify(
      idToken, 
      config.clientSecret,
      {
        algorithms: ["HS256"] as Algorithm[],
        issuer: config.functionUrl,
        audience: config.clientId,
      }
    );
  }
  catch( err ){
    console.log("problem verifying", err);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "failed direct github verify: " + forceError(err).message
    });
  }

  if( typeof(result) === 'string' ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL,
      privateMsg: "direct github payload was string: " + result
    });
  }

  return result;
}
