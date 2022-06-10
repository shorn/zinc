import { Agent } from "https";
import fetch, { Response as FetchResponse } from "node-fetch";
import { genericAuthError } from "Util/Error";
import { OAuthTokenRequest, OAuthTokenResponse } from "AuthnApi/OAuth";
import { aaf } from "Shared/Constant";

export class AafApi {

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

  public async getTokenWithPostBody(
    tokenRequest: OAuthTokenRequest
  ): Promise<OAuthTokenResponse>{
    // AAF /token endpoint doesn't support json, gives a 500 error
    const encodedBody = formatUrlEncodedBody(tokenRequest);
    const aafResponse = await fetch(aaf.token, {
      agent: this.httpsAgent,
      method: "POST",
      headers: {
        'Content-Type': 'Content-Type: application/x-www-form-urlencoded'
      },
      body: encodedBody,
    });

    return parseAafTokenResponse(aafResponse);
  }
  
}

function formatUrlEncodedBody(details: any): string{
  let formBody = [];
  for ( let property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  return formBody.join("&");  
}

export async function parseAafTokenResponse(
  response: FetchResponse
): Promise<OAuthTokenResponse>{
  if( response.status !== 200 ){
    throw genericAuthError("AAF /token responded with non-200 code: " +
        `${response.status} (${response.statusText})` );
  }

  const tokenResponse: any = await response.json();

  try {
    return OAuthTokenResponse.parse(tokenResponse);
  }
  catch(err){
    console.log("zod parse error", err);
    throw genericAuthError("AAF /token could not parse response");
  }
}
