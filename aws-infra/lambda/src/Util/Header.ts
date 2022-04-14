import { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy";

// IMPROVE:STO these are case sensitive at the moment, should fix that
const authHeader = "Authorization";
const bearerPrefix = "Bearer ";

export function getBearerToken(event: APIGatewayProxyEvent){
  let accessToken = event.headers[authHeader];
  if( !accessToken ){
    return undefined;
  }
  
  if( !accessToken?.startsWith(bearerPrefix) ){
    throw new Error("authorization header does not contain bearer token");
  }
  
  return accessToken.substring(bearerPrefix.length);
}