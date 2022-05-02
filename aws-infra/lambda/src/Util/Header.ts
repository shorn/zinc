import { LambdaEventHeaders } from "Util/LambdaEvent";

const authLowerHeader = "authorization";
const authInitHeader = "Authorization";
const bearerPrefix = "bearer ";

export function getBearerToken(headers: LambdaEventHeaders): string | undefined{
  // IMPROVE: use a fast case insensitive compare
  let headerValue = headers[authLowerHeader] || 
    headers[authInitHeader];
  if( !headerValue ){
    return undefined;
  }

  const tokenPrefix = headerValue.slice(0, bearerPrefix.length);
  
  if( tokenPrefix.toLowerCase() !== bearerPrefix ){
    throw new Error("authorization header does not contain bearer token");
  }

  let token = headerValue.slice(bearerPrefix.length).trim();
  if( !token ){
    // convert truthiness into explicit error
    throw new Error("authorization header does not contain bearer token");
  }
  
  return token;
}