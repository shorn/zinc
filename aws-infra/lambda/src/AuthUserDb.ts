import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda/trigger/api-gateway-proxy";
import { JwtRsaVerifier } from "aws-jwt-verify";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import {
  ApiRequest,
  AuthorizationRequest,
  AuthorizedRequest,
  AuthorizeResponse,
  AuthzTokenPayload,
  CognitoConfig,
  SignUpResponse,
  SignUpUserRequest,
  User
} from "../../../shared/ApiTypes";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";
import { initialParamValue } from "../../src/Stack/CredentialSsmStack";
import { forceError } from "Util/Error";
import { readStringListParam, readStringParam } from "Util/Ssm";
import { signAuthzToken, verifyAuthzToken } from "Jwt/AuthzToken";

const name = "AuthUserDb"
const accessTokenLifeSeconds = 1 * 24 * 60 * 60;


const db = {
  users: [] as User[],
}

console.log(name + " init");

//const env = {
//}


export interface LambdaConfig {
  cognito: CognitoConfig,
  verifier: {
    google: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
    //aauthorization: JwtRsaVerifierSingleIssuer<AuthzVerifierProps>,
  },
  authzSecrets: string[],
}

export interface CognitoVerifierProps {
  issuer: string,
  audience: string,
  jwksUri: string,
}

export interface AuthzVerifierProps {
  issuer: string,
  audience: string,
}

async function initConfig(reload = false): Promise<LambdaConfig>{
  if( !reload && config ){
    return config;
  }

  const cognitoRegion = readStringParam(
    process.env.COGNITO_REGION_SSM_PARAM);
  const googleUserPoolId = readStringParam(
    process.env.COGNITO_GOOGLE_USER_POOL_ID_SSM_PARAM);
  const googleUserPoolDomain = readStringParam(
    process.env.COGNITO_GOOGLE_USER_POOL_DOMAIN_SSM_PARAM);
  const googleClientId = readStringParam(
    process.env.COGNITO_GOOGLE_USER_POOL_CLIENT_ID_SSM_PARAM);
  const authzSecretsSsmParam = readStringListParam(process.env.AUTHZ_SECRETS_SSM_PARAM);

  const idpUrl: string = `https://cognito-idp.` +
    `${await cognitoRegion}.amazonaws.com/` +
    `${await googleUserPoolId}`;

  const googleVerifier = JwtRsaVerifier.create({
    issuer: idpUrl,
    audience: await googleClientId,
    jwksUri: `${idpUrl}/.well-known/jwks.json`,
  });
  console.log("google verifier created", idpUrl);

  return {
    cognito: {
      region: await cognitoRegion,
      google: {
        userPoolId: await googleUserPoolId,
        userPoolClientId: await googleClientId,
        userPoolDomain: await googleUserPoolDomain,
      }
    },
    verifier: {
      google: googleVerifier,
    },
    authzSecrets: await authzSecretsSsmParam,
  }

}

// executes at lambda init-time
let config: Promise<LambdaConfig> = initConfig();

export const handler: APIGatewayProxyHandlerV2 = async (
  event, context
): Promise<object> => {
  //console.log(name+" exec", event, context);
  console.log(name + " exec");

  try {
    const req = parseApiRequest(event);
    const res = await dispatchRequest(req);

    return {statusCode: 200, body: JSON.stringify(res, null, 4)};

  } catch( err ){
    if( err instanceof AuthError ){
      console.error("auth error", err.message, err.cause);
      return {
        statusCode: 400,
        body: err.message,
      };
    }
    console.error("error", err);
    //return { statusCode: 500, body: JSON.stringify(err, null, 4) };
    return {statusCode: 500, body: err};
  }
};

function parseApiRequest(event: APIGatewayProxyEventV2): ApiRequest{
  if( !event.body ){
    throw new Error("no event body");
  }
  const body: any = JSON.parse(event.body);

  if( !body.type ){
    throw new Error("request body has no [type] field");
  }

  return body as ApiRequest;
}

async function dispatchRequest(req: ApiRequest): Promise<object>{
  console.log("dispatching", req.type);
  switch( req.type ){
    case "SignUpUser":
      return signUpUser(req.payload, await config);
    case "Authorize":
      return authorizeUser(req.payload, await config);
    case "ListUsers":
      return listPublicUserData(req.payload, await config);
    case "ReadConfig":
      // do not return secrets
      return (await config).cognito;
    case "ReloadConfig":
      config = initConfig(true);
      return (await config).cognito;
    case "KeepAlive":
      return {};
  }
}

export interface ServerAuthzContainer {
  access: AuthzTokenPayload,
  user: User,
}

/** This is for verifying the AccessToken sent by the client.
 * Called by endpoints that restrict access.  
 */
async function guardAuthz(req: AuthorizedRequest, config: LambdaConfig)
: Promise<ServerAuthzContainer>{
  console.log("verifying", req.accessToken);

  //const decoded = decode(req.accessToken) as JwtPayload;
  //console.log("JWT expires", parseJwtDate(decoded.exp))

  const auth: AuthzTokenPayload = verifyAuthzToken({
    accessToken: req.accessToken, 
    secrets: config.authzSecrets });
  
  const userEmail: string = auth.email;

  let user = await findUser(userEmail);

  if( !user ){
    throw new AuthError("while authorizing", 
      new Error("no such user: " + userEmail) );
  }
  
  if( !user.enabled ){
    throw new AuthError("while authorizing", new Error("user disabled"));
  }
  
  if( user.onlyAfter ){
    if( user.onlyAfter.getTime() > new Date().getTime() ){
      throw new AuthError("while authorizing",
        new Error("authz only allowed after: " +
          user.onlyAfter.toISOString()));
    }
  }

  return {
    access: auth,
    user
  };
}

/** This is for turning an IdToken into an AccessToken */
async function authorizeUser(
  req: AuthorizationRequest,
  config: LambdaConfig
): Promise<AuthorizeResponse>{
  console.log("verifying", req.idToken);

  //const decoded = decode(req.idToken) as JwtPayload;
  //console.log("JWT expires", parseJwtDate(decoded.exp))
  let payload: JwtPayload;
  try {
    payload = await config.verifier.google.verify(req.idToken);
  } catch( err ){
    throw new AuthError("while verifying", forceError(err));
  }

  if( !payload.email || typeof (payload.email) !== "string" ){
    throw new AuthError("while verifying", new Error("payload.email invalid"));
  }
  const userEmail: string = payload.email;

  let user = await findUser(userEmail);

  if( !user ){
    // no sign up button for Google, just add them
    user = await addUser(userEmail);
  }
  
  if( !user.enabled ){
    throw new AuthError("while authorizing", new Error("user disabled"));
  }
  if( user.onlyAfter ){
    if( user.onlyAfter.getTime() > new Date().getTime() ){
      throw new AuthError("while authorizing",
        new Error("authz only allowed after: " +
          user.onlyAfter.toISOString()));
    }
  }

  console.log("User is valid, generation access token");

  const {authzSecrets} = config;
  if( !authzSecrets || authzSecrets.length === 0 ){
    throw new AuthError("while authorizing",
      new Error("no authzSecrets defined"));
  }
  
  if( authzSecrets[0].length <= initialParamValue.length ){
    throw new AuthError("while authorizing",
      new Error("authzSecret[0] is too short, pick a better value"));
  }

  const accessToken = signAuthzToken({
    email: user.email, 
    secret: authzSecrets[0], 
    expiresInSeconds: accessTokenLifeSeconds });

  return {
    succeeded: true,
    accessToken,
  }
}

async function addUser(email:string): Promise<User>{
  const user = {
    email: email,
    enabled: true,
  };
  db.users.push(user)

  return user;
}

async function findUser(email: string): Promise<User|undefined>{
  return db.users.find(it => it.email === email);
}

async function signUpUser(
  req: SignUpUserRequest,
  config: LambdaConfig
): Promise<SignUpResponse>{
  console.log("verifying", req.idToken);

  let payload: JwtPayload;
  try {
    payload = await config.verifier.google.verify(req.idToken);
  } catch( err ){
    throw new AuthError("while verifying", forceError(err));
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

// this is bad, don't leak emails
async function listPublicUserData(req: AuthorizedRequest, config: LambdaConfig): Promise<User[]>{
  await guardAuthz(req, config);
  return db.users;
}

// structure is too opaque, rename to "public" and "private" messages 
class AuthError extends Error {
  cause: Error;

  constructor(msg: string, cause: Error){
    super(msg);
    this.cause = cause;
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AuthError.prototype);
  }

}

export function parseJwtDate(date: string | number | undefined): Date | undefined{
  if( !date ){
    return undefined;
  }

  if( !Number.isInteger(date) ){
    console.debug("date was not an integer", date);
    return undefined;
  }

  return new Date(Number(date) * 1000);
}
