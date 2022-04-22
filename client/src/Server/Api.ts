import { ApiMap } from "shared/ApiTypes";
import { dateTimeReviver } from "Util/DateUtil";

export type AuthorizeResponse = {
  succeeded: true,
  accessToken: string,
} | {
  succeeded: false,
  message: string,
}

export interface User {
  email: string,
  enabled: boolean,
  onlyAfter?: Date,
}

export const api: ApiMap = {
  authorize: {
    post: (req, idToken) => apiMapPost("authorize", req, idToken)
  },
  readConfig: {
    post: () => apiMapPost("readConfig", {})
  },
  listUsers: {
    post: (req, token) => apiMapPost("listUsers", req, token)
  },
} 

export async function apiMapPost(type: string, req: Record<string, any>, accessToken?: string){
  return postFetch(type, req, accessToken);
}

// not sure about the Record type, it just got me going
async function postFetch(
  type: string,
  body: Record<string, any>,
  /** Most of the time this is the `accessToken`, except for when calling 
   * `authorize()`, when it's the `idToken`.  Probably should just have a 
   * specialised `authorize()` function. */
  authToken?: string,
): Promise<any>{
  let headers = new Headers();
  headers.append("Accept", 'application/json');
  headers.append("Content-Type", 'application/json');
  headers.append("Accept-Encoding", 'gzip, deflate');
  if( authToken ){
    headers.append("Authorization", 'Bearer ' + authToken);
  }
  let response: Response = await fetch(
    /* the parameter is just so I can see what request is what in the console
     network view - not used on the server side.
     Might make sense to add aa param to specify keys that should go in the 
     URL on a per-request basis. */
    `/api-prd/lambda-v2?type=${type}`,
    {
      method: 'POST',
      headers: headers,
      // TODO:STO deal with dates
      body: JSON.stringify(body),
    }
  );

  if( response.status !== 200 ){
    console.log("non-200!");
    const message = await response.text();
    throw new Error("server error: " + message);
  }
  
  return await jsonParse(response);
}

export async function jsonParse(response: Response): Promise<any>{
  const text = await response.text();
  /* crazy dodgy dateTime shennanigans - this kind of silliness
   is why I prefer an IDL */
  return JSON.parse(text, dateTimeReviver);
}
