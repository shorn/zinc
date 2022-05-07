import { Agent } from "https";
import fetch, { Response as FetchResponse } from "node-fetch";
import { AuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import { OAuthTokenRequest, OAuthTokenResponse } from "OAuth/OAuth";

export class GoogleApi {

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

  public async getToken(
    tokenRequest: OAuthTokenRequest
  ): Promise<OAuthTokenResponse>{
    const githubResponse = await fetch("https://oauth2.googleapis.com/token", {
      agent: this.httpsAgent,
      method: "POST",
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenRequest),
    });

    return parseGoogleTokenResponse(githubResponse);
  }
}


export async function parseGoogleTokenResponse(
  response: FetchResponse
): Promise<OAuthTokenResponse>{
  if( response.status !== 200 ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "Google /token responded with non-200 code: " +
        `${response.status} (${response.statusText})`
    });
  }

  const tokenResponse: any = await response.json();

  try {
    return OAuthTokenResponse.parse(tokenResponse);
  }
  catch(err){
    console.log("zod parse error", err);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "Google /token could not parse response"
    });
  }
}
