import { Agent } from "https";
import fetch, { Response as FetchResponse } from "node-fetch";
import { AuthError } from "Util/Error";
import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";
import {
  AuthorizeCodeGrantParameters,
  OAuthTokenRequest
} from "AuthnApi/OAuth";

/* Hardcoded because Zinc is only designed to work with public Github, not
the enterprise version. */
const githubUrlBase = {
  authorize: "https://github.com/login/oauth/authorize",
  token: "https://github.com/login/oauth/access_token",
  userDetail: "https://api.github.com/user",
  userEmails: "https://api.github.com/user/emails",
}

export interface GithubTokenResponse {
  access_token: string,
  token_type: string,
  scope: string,
}

/**
 * see /doc/lambda/github-api-user-response.md
 */
export interface GithubUserDetail {
  id: number,
}

/**
 * see /doc/lambda/github-api-user-emails-response.md
 */
export interface GithubUserEmail {
  email: string,
  primary: boolean,
  verified: boolean,
}

/**
 * Defined by the GithubCognitoStack USerPool IdProvider AttributeMapping
 */
export type ZincMappedOidcAttributes = {
  sub: string,
  email: string,
  email_verified: boolean,
};

/** Github request flow is modelled as a stateful class so the http connection
 * can be keepAlive'd.
 * <p>
 * Note: It is intended that this class should be instantiated per Lambdas
 * invocation though because it has no handling for ECONNRESET (i.e. don't
 * initialise it in Lamba "warm-up" phase and assign it to a global).
 * <p>
 * IMPROVE: impelement re-connect/re-try logic in the methods to allow the
 * Lambda the oppportunity to cache the connection across invocations.
 * Note: I haven't actually seen an ECONNRESET, but the concept of `keepAlive`
 * obviously brings error-handling issues that the `Agent` doco doesn't seem to
 * mention and I found stuff like:
 * https://connectreport.com/blog/tuning-http-keep-alive-in-node-js/
 * <p>
 * Note that this isn't going to be as good of an optimisation as I thought,
 * I just noticed the calls are spread across multiple domains (i.e.
 * `github.com` and `api.github.com`).
 */
export class GithubApi {

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
  ): Promise<GithubTokenResponse>{
    const githubResponse = await fetch(githubUrlBase.token, {
      agent: this.httpsAgent,
      method: "POST",
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenRequest),
    });

    return parseGithubTokenResponse(githubResponse);
  }

  /**
   * Effectively, this does the "AttributeMapping" that Cognito does for you
   * when the IdProvider supports OIDC directly. 
   */
  public async mapOidcAttributes(
    accessToken: string
  ): Promise<ZincMappedOidcAttributes>{
    const [userDetails, userEmail]: [GithubUserDetail, GithubUserEmail] = 
      await Promise.all([
        this.getUserDetails(accessToken),
        this.getUserEmail(accessToken),
      ]);

    /* Standard OIDC claims, but only the ones that we defined in the
    UserPool IdProvider AttributeMapping */
    return {
      // OIDC says this must be string
      sub: userDetails.id.toString(),
      email: userEmail.email,
      email_verified: userEmail.verified,
    }
  }

  private async getUserDetails(accessToken: string): Promise<GithubUserDetail>{
    const res = await fetch(githubUrlBase.userDetail, {
      agent: this.httpsAgent,
      method: "GET",
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Token ${accessToken}`,
      },
    });
    if( res.status !== 200 ){
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          `GitHub API /user failed: ${res.status} - ${res.statusText}`
      });
    }

    const data: any = await res.json();

    if( !data ){
      console.error("Malformed Github API /user reponse", data);
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          "GitHub API /user did not return any data"
      });
    }
    
    if( !data.id ){
      console.error("Malformed Github API /user repsonse", data);
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          "GitHub API /user did not return [id]"
      });
    }

    return data as GithubUserDetail;
  }

  /**
   * Will fail if Github doesn't give us any usable emails.  Not technically
   * necessary for Cognito or OIDC, but  Zinc is designed to use an email.
   */
  private async getUserEmail(
    accessToken: string
  ): Promise<GithubUserEmail>{
    const res = await fetch(githubUrlBase.userEmails, {
      agent: this.httpsAgent,
      method: "GET",
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Token ${accessToken}`,
      },
    });
    if( res.status !== 200 ){
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          `GitHub API /user/emails failed: ${res.status} - ${res.statusText}`
      });
    }

    const emails = await parseGithubUserEmailsResponse(res);

    if( !emails.length ){
      console.error("Malformed Github API /user/emails response", emails);
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          `GitHub API /user/emails returned empty array`
      });
    }
    
    const validEmail = emails.find(it => {
      if( !it.primary ){
        console.log(`not primary`, it)
        return false;
      }
      if( !it.verified ){
        console.log(`not verified`, it)
        return false;
      }
      if( it.email.trim().endsWith("noreply.github.com") ){
        console.log(`is a github norepy`, it)
        return false;
      }
      return true;
    });

    if( !validEmail ){
      console.error("Malformed Github API /user/emails response", emails);
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          `GitHub API /user/emails returned no valid emails`
      });
    }
    
    console.log("chosen github email", validEmail);
    return validEmail;
  }
}

async function parseGithubUserEmailsResponse(
  res: FetchResponse
): Promise<GithubUserEmail[]>{
  const data: any = await res.json();

  if( !data ){
    console.error("Malformed Github API /user/emails response", data);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API /user/email did not return any data"
    });
  }

  if( !Array.isArray(data) ){
    console.error("Malformed Github API /user/emails response", data);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API /user/email result was not an Array"
    });
  }

  data.map((it, index)=>{
    if( !it.email ){
      console.error("Malformed Github API /user/email response", data);
      throw new AuthError({
        publicMsg: GENERIC_DENIAL, privateMsg:
          `GitHub API /user element[${index}] had no [email]`
      });
    }
  });

  return data as GithubUserEmail[];  
}

export function getAuthorizeUrlRedirect(
  params: AuthorizeCodeGrantParameters
): string{
  const {client_id, scope, state, response_type, redirect_uri} = params;

  return githubUrlBase.authorize +
    `?client_id=${client_id}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&response_type=${response_type}`+
    (redirect_uri ? `&redirect_uri=${redirect_uri}` : "");
}

export async function parseGithubTokenResponse(
  response: FetchResponse
): Promise<GithubTokenResponse>{
  if( response.status !== 200 ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API responded with non-200 code: " +
        `${response.status} (${response.statusText})`
    });
  }

  const tokenResponse: any = await response.json();

  if( !tokenResponse ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API responded with no data: " +
        `${response.status} (${response.statusText})`
    });
  }

  if( tokenResponse.error ){
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API responded with a failure: " +
        `${tokenResponse.error}, ${tokenResponse["error_description"]}`
    });
  }

  if( !tokenResponse.scope ){
    console.log("malformed github response", tokenResponse);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API response json has no [scope]"
    });
  }

  if( !tokenResponse.access_token ){
    console.log("malformed github response", tokenResponse);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API response json has no [access_token]"
    });
  }

  if( !tokenResponse.token_type ){
    console.log("malformed github response", tokenResponse);
    throw new AuthError({
      publicMsg: GENERIC_DENIAL, privateMsg:
        "GitHub API response json has no [token_type]"
    });
  }

  // create new object to avoid copying extra Github fields we don't know about 
  return {
    access_token: tokenResponse.access_token,
    token_type: tokenResponse.token_type,
    scope: tokenResponse.scope,
  }
}
