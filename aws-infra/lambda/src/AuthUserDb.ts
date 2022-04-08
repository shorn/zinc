import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda/trigger/api-gateway-proxy";
import { JwtRsaVerifier } from "aws-jwt-verify";
import { JwtPayload } from "aws-jwt-verify/jwt-model";
import {
  ApiRequest,
  AuthorizeRequest,
  AuthorizeResponse,
  CognitoConfig,
  SignUpResponse,
  SignUpUserRequest,
  User
} from "../../../shared/ApiTypes";
import {
  GetParameterCommand,
  GetParameterCommandOutput,
  SSMClient
} from "@aws-sdk/client-ssm";
import { decode, sign } from "jsonwebtoken";
import { JwtRsaVerifierSingleIssuer } from "aws-jwt-verify/jwt-rsa";
import { initialParamValue } from "../../src/Stack/CredentialSsmStack";

const name = "AuthUserDb"


const db = {
  users: [] as User[],
}

console.log(name + " init");

//const env = {
//}


interface LambdaConfig {
  cognito: CognitoConfig,
  verifier: {
    google: JwtRsaVerifierSingleIssuer<CognitoVerifierProps>,
  },
  authzSecrets: string[],
}

export interface CognitoVerifierProps {
  issuer: string,
  audience: string,
  jwksUri: string,
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

const client = new SSMClient({});

let config: Promise<LambdaConfig> = initConfig();


async function readStringParam(name: string | undefined): Promise<string>{

  if( !name ){
    throw new Error("no SSM param name provided");
  }

  const command = new GetParameterCommand({Name: name});
  const response: GetParameterCommandOutput = await client.send(command);

  const paramValue = response.Parameter?.Value;
  if( !paramValue ){
    throw new Error(`no value for SSM param ${name}`);
  }

  return paramValue;
}


async function readStringListParam(name: string | undefined): Promise<string[]>{
  const command = new GetParameterCommand({Name: name});
  const response: GetParameterCommandOutput = await client.send(command);

  const paramValue = response.Parameter?.Value;
  if( !paramValue ){
    throw new Error(`no value for SSM param ${name}`);
  }

  const values = paramValue.split(",");

  if( !values || values.length < 1 ){
    throw new Error(`no values in ${name}`);
  }

  return values;
}

//async function readAuthzSecrets(){
//  if( authzSecrets ){
//    return authzSecrets;
//  }
//  const command = new GetParameterCommand({Name: env.authzSecretsSsmParam});
//  const response: GetParameterCommandOutput = await client.send(command);
//
//  const paramValue = response.Parameter?.Value;
//  if( !paramValue ){
//    throw new AuthError("while authorizing",
//      new Error(`no value for SSM param ${env.authzSecretsSsmParam}`));
//  }
//
//  const secrets = paramValue.split(",");
//
//  if( !secrets || secrets.length < 1 ){
//    throw new AuthError("while authorizing",
//      new Error(`no secrets in ${env.authzSecretsSsmParam}`));
//  }
//
//  secrets.forEach((it, index) => {
//    if( !it || it.length < 16 ){
//      throw new AuthError("while authorizing",
//        new Error(`secrets ${index} is too short:  ${it?.length}`));
//    }
//  })
//
//  authzSecrets = secrets;
//  return authzSecrets;
//}

export const handler: APIGatewayProxyHandlerV2 = async (
  event, context
): Promise<object> => {
  //console.log(name+" exec", event, context);
  console.log(name + " exec");
  const execConfig: LambdaConfig = await config;

  try {
    const req = parseApiRequest(event);
    const res = await dispatchRequest(req, execConfig);

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

  //if( !body.payload ){
  //  throw new Error(`request [type]=[${body.type}] has no [payload] field`);
  //}

  return body as ApiRequest;
}

async function dispatchRequest(req: ApiRequest,
  config: LambdaConfig
): Promise<object>{
  console.log("dispatching", req.type);
  switch( req.type ){
    case "SignUpUser":
      return signUpUser(req.payload, config);
    case "Authorize":
      return authorizeUser(req.payload, config);
    case "ReadConfig":
      // do not return secrets
      return (await initConfig()).cognito;
    case "ReloadConfig":
      return (await initConfig(true)).cognito;
    case "KeepAlive":
      return {};
  }
}


async function authorizeUser(
  req: AuthorizeRequest,
  config: LambdaConfig
): Promise<AuthorizeResponse>{
  console.log("verifying", req.idToken);

  const decoded = decode(req.idToken) as JwtPayload;
  console.log("JWT expires", parseJwtDate(decoded.exp))
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

  let user = db.users.find(it => it.email === userEmail);

  if( !user ){
    throw new AuthError("while authorizing",
      new Error(`user not exist: ${userEmail}`));
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

  const accessToken = sign(
    {
      email: user.email,
      role: "user",
    },
    // always sign with first secret, always rotate by adding to beginning
    authzSecrets[0],
    {
      algorithm: "HS256",
      expiresIn: 1 * 24 * 60 * 60
    });

  return {
    succeeded: true,
    accessToken,
  }
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

  let existingUser = db.users.find(it => it.email === userEmail);
  if( existingUser ){
    console.log("user already exists", existingUser);
    return {user: existingUser};
  }

  const user = {
    email: payload.email as string,
    enabled: true,
  };
  db.users.push(user)

  return {user};
}

// don't leak emails
function listPublicUserData(){

}

export function forceError(e: unknown): Error{
  if( !e ){
    return new Error("[null or undefined]");
  }
  if( e instanceof Error ){
    return e;
  }
  if( typeof e === 'string' ){
    return new Error(e);
  }
  if( typeof e === 'object' ){
    return new Error(e.toString());
  }
  return new Error("unknown error");
}

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
