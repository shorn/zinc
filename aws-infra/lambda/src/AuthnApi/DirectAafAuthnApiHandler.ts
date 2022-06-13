import { AuthError, forceError, isError } from "Util/Error";
import {
  DANGERouslyLog,
  DANGERouslyLogEvent,
  formatErrorResponse,
  formatRedirectResponse,
  LambdaFunctionUrlEvent,
  LambdaResponse
} from "Util/LambdaEvent";
import { OAuthClientConfig, readOAuthConfigFromSsm } from "LambdaConfig";
import {
  OAuthTokenResponse,
  parseIdpResponse,
  validateRedirectUri
} from "AuthnApi/OAuth";
import { AafApi } from "AuthnApi/Downstream/AafApi";
import { decode } from "jsonwebtoken";

const name = "DirectAafAuthnApi";

// time spent in here is part of the "cold start" 
let config: Promise<OAuthClientConfig> = initConfig();

async function initConfig(): Promise<OAuthClientConfig>{
  if( config ){
    return config;
  }

  const result = await readOAuthConfigFromSsm(
    process.env.DIRECT_AAF_AUTHN_CONFIG_SSM_PARAM );
  if( isError(result) ){
    throw result;
  }
  return result;
}

export async function handler(
  event: LambdaFunctionUrlEvent,
): Promise<LambdaResponse>{
  console.log(name + " exec ");

  try {

    const apiResult = await dispatchApiCall(event, await config);
    if( apiResult ){
      return apiResult;
    }
    
    console.error("failed to dispatch", event);
    return formatErrorResponse(404, "invalid API call");

  }
  catch( err ){
    if( err instanceof AuthError ){
      console.error("auth error", err.message, err.privateMsg);
      return formatErrorResponse(400, err.message);
    }
    console.error("error", err);
    return formatErrorResponse(500, forceError(err).message);
  }
}

async function dispatchApiCall(
  event: LambdaFunctionUrlEvent,
  config: OAuthClientConfig
):Promise<LambdaResponse|undefined>{
  const {method, path} = event.requestContext.http; 
  const query = event.queryStringParameters;
  DANGERouslyLogEvent(name, event);
  
  if( method === "GET" && path === "/idpresponse" ){
    // do not log the tokenRequest without protecting the secrets it contains
    const idpResponse = parseIdpResponse(query);
    validateRedirectUri(idpResponse.state.redirectUri, 
      config.allowedCallbackUrls);

    const aafApi = new AafApi();

    /* logging this will log the access and id tokens - not quite as bad as 
    logging a secret since it has an expiry, but still not something we want 
    to leak. */
    const aafToken = await aafApi.getTokenWithPostBody({
      code: idpResponse.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: `https://${event.headers.host}/idpresponse`,
    });

    await inspectAafData(aafToken);
    
    // redirect back to the client with the new id_token
    const signedInUrl = idpResponse.state.redirectUri +
      `#id_token=${aafToken.id_token}`;
    return formatRedirectResponse(signedInUrl);
  }

  return undefined;
}

async function inspectAafData(token: OAuthTokenResponse){
  
  const idToken = token.id_token;
  
  if( !idToken ){
    console.log("no idToken");
    return;
  }
  
  const decoded = decode(idToken);
  DANGERouslyLog("decoded id_token", decoded);

  if( !decoded ){
    console.log("decoded was empty");
    return;
  }
  
  if( typeof decoded === "string" ){
    console.log("unexpected token string", decoded);
    return;
  }

  const aafApi = new AafApi();
  const response = await aafApi.getUserInfo(token);
  console.log("/userinfo data", response);
  
}
