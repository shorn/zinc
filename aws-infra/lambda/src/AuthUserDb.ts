import { APIGatewayProxyHandler } from "aws-lambda";
import { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy";
import { JwtRsaVerifier } from "aws-jwt-verify";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import {
  ApiMap,
  AuthorizationRequest,
  AuthorizedRequest,
  AuthorizeResponse,
  AuthzTokenPayload,
  CognitoConfig,
  SignUpResponse,
  SignUpUserRequest,
  User
} from "shared/ApiTypes";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";
import { AuthError, forceError } from "Util/Error";
import { readStringListParam, readStringParam } from "Util/Ssm";
import { signAuthzToken, verifyAuthzToken } from "Jwt/AuthzToken";
import { initialParamValue } from "../../src/Stack/CredentialSsmStack";

const name = "AuthUserDb"
const accessTokenLifeSeconds = 1 * 24 * 60 * 60;


const db = {
  users: [] as User[],
}

console.log(name + " init");

export const api: ApiMap = {
  authorize: {
    post: async req => authorizeUser(req, await config),
  },
  readConfig: {
    post: async () => (await config).cognito,
  },
  initConfig: {
    post: async () => {
      config = initConfig(true);
      return (await config).cognito;
    },
  },
  listUsers: {
    post: async req => listPublicUserData(req, await config),
  },
}


export interface AuthUserConfig {
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

async function initConfig(reload = false): Promise<AuthUserConfig>{
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
let config: Promise<AuthUserConfig> = initConfig();

export const handler: APIGatewayProxyHandler = async (
  event, context
)=> {
  //console.log(name+" exec", event, context);
  console.log(name + " exec");

  try {
    //const req = parseApiRequest(event);
    //const res = await dispatchRequest(req);
    
    const res = await dispatchApiCall(event);

    return {statusCode: 200, body: JSON.stringify(res, null, 4)};

  } catch( err ){
    if( err instanceof AuthError ){
      console.error("auth error", err.message, err.privateMsg);
      return {
        statusCode: 400,
        body: err.message,
      };
    }
    console.error("error", err);
    return {statusCode: 500, body: forceError(err).message};
  }
};

/** Does JSON parsing, validates the body.type field is a valid API Call.
 */
function parseApiCallType(event: APIGatewayProxyEvent)
: object & { type: keyof ApiMap} {
  if( !event.body ){
    throw new Error("no event body");
  }
  const body: any = JSON.parse(event.body);

  if( !body.type ){
    throw new Error("request body has no [type] field");
  }

  /* note that there is no runtime validation of the the request, so WHEN 
   I stuff up version syncing, it's going to be a pain to diagnose :( */

  let validApiCalls = Object.keys(api);
  if( !(validApiCalls.includes(body.type)) ){
    console.error("unknown ApiCall.type", body.type, event)
    throw new Error("unknown ApiCall.type="+body.type);
  }

  return body;
}

async function dispatchApiCall(event: APIGatewayProxyEvent){
  if( event.httpMethod !== "POST"){
    throw new Error("this api only supports POST at the moment");
  }

  const apiCall = parseApiCallType(event);
  console.log("apiCall", apiCall);
  
  const call = api[apiCall.type].post;
  
  return await call(apiCall as any);
}


export interface ServerAuthzContainer {
  access: AuthzTokenPayload,
  user: User,
}

/** Verify the AccessToken sent by the client.
 * Called by endpoints that restrict access.  
 */
async function guardAuthz(req: AuthorizedRequest, config: AuthUserConfig)
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
    throw new AuthError({publicMsg: "while authorizing", 
      privateMsg: "no such user: " + userEmail });
  }
  
  if( !user.enabled ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "user disabled" });
  }
  
  if( user.onlyAfter ){
    if( user.onlyAfter.getTime() > new Date().getTime() ){
      throw new AuthError({publicMsg: "while authorizing",
        privateMsg: "authz only allowed after: " +
          user.onlyAfter.toISOString() });
    }
  }

  return {
    access: auth,
    user
  };
}

/** Turns an IdToken into an AccessToken */
async function authorizeUser(
  req: AuthorizationRequest,
  config: AuthUserConfig
): Promise<AuthorizeResponse>{
  console.log("verifying", req.idToken);

  //const decoded = decode(req.idToken) as JwtPayload;
  //console.log("JWT expires", parseJwtDate(decoded.exp))
  let payload: JwtPayload;
  try {
    payload = await config.verifier.google.verify(req.idToken);
  } catch( err ){
    throw new AuthError({publicMsg: "while verifying", 
      privateMsg: forceError(err).message });
  }

  if( !payload.email || typeof (payload.email) !== "string" ){
    throw new AuthError({publicMsg: "while verifying",
      privateMsg: "payload.email invalid" });
  }
  const userEmail: string = payload.email;

  let user = await findUser(userEmail);

  if( !user ){
    // no sign up button for Google, just add them
    user = await addUser(userEmail);
  }
  
  if( !user.enabled ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "user disabled" });
  }
  if( user.onlyAfter ){
    if( user.onlyAfter.getTime() > new Date().getTime() ){
      throw new AuthError({publicMsg: "while authorizing",
        privateMsg: "authz only allowed after: " +
          user.onlyAfter.toISOString() });
    }
  }

  console.log("User is valid, generation access token");

  const {authzSecrets} = config;
  if( !authzSecrets || authzSecrets.length === 0 ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "no authzSecrets defined" });
  }
  
  if( authzSecrets[0].length <= initialParamValue.length ){
    throw new AuthError({publicMsg: "while authorizing",
      privateMsg: "authzSecret[0] is too short, pick a better value" });
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

// this is bad, don't leak emails like this
async function listPublicUserData(
  req: AuthorizedRequest, 
  config: AuthUserConfig): Promise<User[]>
{
  await guardAuthz(req, config);
  return db.users;
}

