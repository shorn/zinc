import { ApiCall, ApiMap } from "shared/ApiTypes";
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
    post: req => {
      return apiMapPost({...req, type: "authorize"});
    },
  },
  readConfig: {
    post: () => apiMapPost({type:"readConfig"}),
  },
  initConfig: {
    post: () => apiMapPost({type:"readConfig"}),
  },
  listUsers: {
    post: (req) => apiMapPost({...req, type:"listUsers"}),
  },
} 

export async function apiMapPost(req: ApiCall){
  return postFetch(req);
}

// not sure about the Record type, it just got me going
async function postFetch(
  body: Record<string, any> & {type: string},
): Promise<any>{
  let headers = new Headers();
  headers.append("Accept", 'application/json');
  headers.append("Content-Type", 'application/json');
  headers.append("Accept-Encoding", 'gzip, deflate');
  let response: Response = await fetch(
    /* the parameter is just so I can see what request is what in the console
     network view - not used on the server side.
     Might make sense to add aa param to specify keys that should go in the 
     URL on a per-request basis. */
    `/api-prd/lambda-v2?type=${body.type}`,
    {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    }
  );

  if( response.status !== 200 ){
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

export interface CognitoConfig {
  region: string,
  //email: {
  //  userPoolId: string,
  //  userPoolClientId: string,
  //},
  google: {
    userPoolId: string,
    userPoolClientId: string,
    userPoolDomain: string,
  },
}