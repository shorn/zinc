import { Agent } from "https";
import fetch, { Response as FetchResponse } from "node-fetch";
import { AuthError, genericAuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { twitter } from "Shared/Constant";
import { z as zod } from "zod";
import * as crypto from "crypto-js";
import { URLSearchParams } from "url";


type ParamType = Record<string, string | number | boolean>;

export class TwitterApi {

  private _httpsAgent: Agent;

  constructor(){
  }

  get httpsAgent(){
    if( this._httpsAgent ){
      return this._httpsAgent;
    }

    this._httpsAgent = new Agent({keepAlive: true});
    return this._httpsAgent;
  }

  public async getAppOAuthToken({
    consumerKey, consumerSecret, callbackUrl
  }: AppOAuthTokenRequest): Promise<AppOAuthTokenResponse>{
    const oAuthParams: any = {
      ...createOAuthHeaderBase(),
      oauth_consumer_key: consumerKey,
      oauth_callback: callbackUrl };
    oAuthParams.oauth_signature = createSignature(
      oAuthParams, 'POST', twitter.tokenRequestUrl, consumerSecret );
    
    const res = await fetch(twitter.tokenRequestUrl, {
      agent: this.httpsAgent,
      method: "POST",
      headers: {Authorization: formatOAuthHeader(oAuthParams)},
    });
    
    return parseAppOAuthTokenResponse(res);
  }

  /**
   * Exchange [an oauth_token,oauth_verifier] pair for an oauth_token_secret
   */
  public async getUserOAuthToken({
    consumerKey, consumerSecret, oauthToken, oauthVerifier
  }: UserOAuthTokenRequest): Promise<UserOAuthTokenResponse>{
    const oAuthParams: any = {
      ...createOAuthHeaderBase(),
      oauth_consumer_key: consumerKey,
      oauth_token: oauthToken };
    oAuthParams.oauth_signature = createSignature(
      oAuthParams, 'POST', twitter.accessTokenUrl, consumerSecret );

    const res = await fetch(twitter.accessTokenUrl, {
      agent: this.httpsAgent,
      method: "POST",
      headers: {
        Authorization: formatOAuthHeader({
          ...oAuthParams, oauth_verifier: encodeURIComponent(oauthVerifier) 
        })
      },
    });
    return parseUserOAuthTokenResponse(res);
  }

  public async getUserVerifiyCredentials({
    consumerKey, consumerSecret, 
    oauthToken, oauthTokenSecret
  }: UserApiRequest): Promise<TwitterVerifyCredentialsResponse>{
    
    const queryParams = {
      include_email: "true",
      include_entities: "false",
      skip_status: "true",
    };

    const oauthParams: ParamType = {
      ...createOAuthHeaderBase(),
      ...queryParams,
      // identifies the app
      oauth_consumer_key: consumerKey,
      // identifies the user
      oauth_token: oauthToken,
    };

    oauthParams.oauth_signature = createSignature(
      oauthParams, "GET", twitter.verifyCredentialsUrl,
      consumerSecret, oauthTokenSecret );

    const queryString = twitter.verifyCredentialsUrl + 
      "?" + new URLSearchParams(queryParams);
    
    const res = await fetch(queryString, {
      agent: this.httpsAgent,
      method: "GET",
      headers: {Authorization: formatOAuthHeader(oauthParams)},
    });
    
    return parseVerifyCredentialsRepsonse(res);
  }
  
}

async function parseVerifyCredentialsRepsonse(
  res: FetchResponse
): Promise<TwitterVerifyCredentialsResponse>{
  if( res.status !== 200 ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        `Twitter /verify_credentials failed: ${res.status} - ${res.statusText}`
    });
  }

  const json: any = await res.json();

  if( !json ){
    throw genericAuthError("Twitter /verify_credentials returned no json");
  }
  if( json.errors ){
    console.log("Twitter /verify_credentials returned errors", json.errors);
    throw genericAuthError("Twitter /verify_credentials returned errors");
  }

  return TwitterVerifyCredentialsResponse.parse(json);
}

async function parseAppOAuthTokenResponse(
  res: FetchResponse
): Promise<AppOAuthTokenResponse>{
  if( res.status !== 200 ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        `Twitter API tokenRequest failed: ${res.status} - ${res.statusText}`
    });
  }

  const response = await res.text();

  const tokenResponse = parseFormEncoding(response);
  const oAuthToken: string = tokenResponse.oauth_token as string;
  if( !oAuthToken ){
    throw genericAuthError("Twitter API tokenRequest returned no authToken");
  }
  const oAuthTokenSecret = tokenResponse.oauth_token_secret as string;
  if( !oAuthTokenSecret ){
    throw genericAuthError(
      "Twitter API tokenRequest returned no authTokenSecret");
  }

  return {
    oAuthToken,
    oAuthTokenSecret
  };
}

export async function parseUserOAuthTokenResponse(
  response: FetchResponse
): Promise<UserOAuthTokenResponse>{
  if( response.status !== 200 ){
    throw genericAuthError(
      "Twitter /access_token responded with non-200 code: " +
        `${response.status} (${response.statusText})`  );
  }

  const text = await response.text();
  if( !text ){
    throw genericAuthError(
      "Twitter /access_token returned no response text");
  }

  const tokenResponse = parseFormEncoding(text);

  const oAuthToken: string = tokenResponse.oauth_token as string;
  if( !oAuthToken ){
    throw genericAuthError("Twitter API /access_token returned no oauth_token");
  }
  const oAuthTokenSecret = tokenResponse.oauth_token_secret as string;
  if( !oAuthTokenSecret ){
    throw genericAuthError(
      "Twitter API /access_token returned no oauth_token_secret");
  }
  const userId: string = tokenResponse.user_id as string;
  if( !userId ){
    throw genericAuthError("Twitter API /access_token returned no user_id");
  }
  const screenName: string = tokenResponse.screen_name as string;
  if( !screenName ){
    throw genericAuthError("Twitter API /access_token returned no screen_name");
  }
  
  return {oAuthToken, oAuthTokenSecret, userId, screenName};
}

/**
 * Creates the header with the base parameters (Date, nonce etc...)
 * @return {Object} returns a header dictionary with base fields filled.
 */
function createOAuthHeaderBase(): ParamType{
  return {
    oauth_nonce: createNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: new Date().getTime() / 1000,
    oauth_version: '1.0',
  };
}

const possibleNonceChar =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Creates a nonce for OAuth header
 * @return {string} nonce
 */
function createNonce(): string{
  let text = '';
  /* IMPROVE: Math.random() is not suitable, use an accepted crypto 
   primitive designed for the task */
  for( let i = 0; i < 32; i += 1 ){
    text += possibleNonceChar.charAt(
      Math.floor(Math.random() * possibleNonceChar.length));
  }
  return text;
}

/**
 * Parse a form encoded string into an object
 * @param  {string} formEncoded Form encoded string
 * @return {Object}             Decoded data object
 */
function parseFormEncoding(formEncoded: string): ParamType {
  const pairs = formEncoded.split('&');
  const result: ParamType = {};
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    result[key] = value;
  }
  return result;
}


/**
 * Creates the Signature for the OAuth header
 * @param  {Object}  params         OAuth + Request Parameters
 * @param  {string}  httpMethod     Type of Method (POST,GET...)
 * @param  {string}  requestURL     Full Request URL
 * @param  {string}  consumerSecret Twitter Consumer Secret
 * @param  {?string} tokenSecret    Secret token (Optional)
 * @return {string}                 Returns the encoded/hashed signature
 */
function createSignature(
  params: ParamType,
  httpMethod: "GET" | "POST",
  requestURL: string,
  consumerSecret: string,
  tokenSecret?: string
){
  const encodedConsumerSecret = encodeURIComponent(consumerSecret);

  const signatureBaseString = httpMethod.toUpperCase() +
    '&' + encodeURIComponent(requestURL) +
    '&' + encodeURIComponent(formatEncodedQueryString(params));

  let signingKey;
  if( tokenSecret ){
    signingKey = encodedConsumerSecret + '&' + encodeURIComponent(tokenSecret);
  }
  else {
    signingKey = encodedConsumerSecret + '&';
  }
  
  const signature = crypto.HmacSHA1(signatureBaseString, signingKey);
  return crypto.enc.Base64.stringify(signature);
}


/**
 * Percent encode parameters, format as `<key>=<value>`
 * then join them all with `&`.  
 * 
 * @param  {Object} params Dictionary of params
 * @return {string}        Percent encoded parameters string
 */
function formatEncodedQueryString(params: ParamType){
  return formatSortedEncodedKeyValuePairs(params).join('&');
}

/**
 * The signature params and auth header params must be sorted lexicographically,
 * after being encoded, according to the Twitter doco.
 */
function formatSortedEncodedKeyValuePairs(params: ParamType): string[]{
  const encoded: [string, string][] = Object.entries(params).map(i =>
    [encodeURIComponent(i[0]), encodeURIComponent(i[1])]
  );

  const sortedEncoded = encoded.sort(
    (left, right)=> left[0].localeCompare(right[0])
  );

  return sortedEncoded.map(i=> `${i[0]}=${i[1]}`);
}

/**
 * Creates the Token Request OAuth header.
 * Prefix "OAuth " and concatenate URI encoded <key>=<value> pairs separated
 * by commas.
 * @param  {Object} params OAuth params
 * @return {string}        OAuth header string
 */
export function formatOAuthHeader(params: ParamType){
  return 'OAuth ' + formatSortedEncodedKeyValuePairs(params).join(', ');
}

export const AppOAuthTokenRequest = zod.object({
  consumerKey: zod.string().nonempty(),
  consumerSecret: zod.string().nonempty(),
  callbackUrl: zod.string().url().nonempty(),
});
export type AppOAuthTokenRequest = zod.infer<typeof AppOAuthTokenRequest>;

export const AppOAuthTokenResponse = zod.object({
  oAuthToken: zod.string().nonempty(),
  oAuthTokenSecret: zod.string().nonempty(),
});
export type AppOAuthTokenResponse = zod.infer<typeof AppOAuthTokenResponse>;

export const UserOAuthTokenRequest = zod.object({
  consumerKey: zod.string().nonempty(),
  consumerSecret: zod.string().nonempty(),
  oauthToken: zod.string().nonempty(),
  //oauthTokenSecret: zod.string().nonempty(),
  oauthVerifier: zod.string().nonempty(),
});
export type UserOAuthTokenRequest = zod.infer<typeof UserOAuthTokenRequest>;

export const UserOAuthTokenResponse = zod.object({
  oAuthToken: zod.string().nonempty(),
  oAuthTokenSecret: zod.string().nonempty(),
  userId: zod.string().nonempty(),
  //oauthTokenSecret: zod.string().nonempty(),
  screenName: zod.string().nonempty(),
});
export type UserOAuthTokenResponse = zod.infer<typeof UserOAuthTokenResponse>;

export const UserApiRequest = zod.object({
  consumerKey: zod.string().nonempty(),
  consumerSecret: zod.string().nonempty(),
  oauthToken: zod.string().nonempty(),
  oauthTokenSecret: zod.string().nonempty(),
});
export type UserApiRequest = zod.infer<typeof UserApiRequest>;

export const TwitterVerifyCredentialsResponse = zod.object({
  id: zod.number(),
  screen_name: zod.string(),
  /** user might not actually have an email */
  email: zod.string().optional(),
});
export type TwitterVerifyCredentialsResponse =
  zod.infer<typeof TwitterVerifyCredentialsResponse>;
