import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult
} from "aws-lambda/trigger/api-gateway-proxy";
import { PartialBy } from "Util/Type";

/** The shape of the event we expect to be passed - was APIGatewayProxyEvent
 * when I was using the API-GW.
 * AFAICT, there is no published model of a "generic" lambda invocation event.
 * <p>
 * I modelled this off of the output of console.log during a few different calls
 * to a Lambda FunctionUrl - see contents of .json files in ./example directory.
 * <p>
 * Be careful, I may have some of the "optional" modifiers wrong (i.e. I've 
 * assumed something will always be there when it might not).
 * I've also only modelled things I care about/use (i.e. http.method only models
 * GET and POST because Zinc doesn't use the other methods).
 */
export type LambdaFunctionUrlEvent = {
  rawPath: string;
  rawQueryString: '',
  headers: LambdaEventHeaders,
  queryStringParameters?: LamdbaQueryStringParameters,
  requestContext: {
    accountId: string,
    apiId: string,
    domainName: string,
    domainPrefix: string,
    http: {
      method: "GET"|"POST",
      path: string,
      protocol: string,
      sourceIp: string,
      userAgent: string,
    },
    requestId: string,
    routeKey: string,
    stage: string,
    time: string,
    timeEpoch: number
  },
  body: string|undefined,
  isBase64Encoded: boolean,
};

/*
 Use type aliases because otherwise reading lambda code gets confusing.
 Also, just in case these are wrong, I can change them without having to touch
 the rest of the codebase (e.g. LambdaResponse).
*/

/**
 * The type is wrong for my usage - a 302 redirect has no body.
 */
export type LambdaResponse = PartialBy<APIGatewayProxyResult, "body">;

export type LamdbaQueryStringParameters =
  APIGatewayProxyEventQueryStringParameters;
export type LambdaEventHeaders = APIGatewayProxyEventHeaders;

export function formatErrorResponse(
  statusCode: number,
  message: string,
): LambdaResponse{
  return {
    statusCode,
    body: JSON.stringify({message}),
  };
}

export function formatSuccessResponse(result: object): LambdaResponse{
  return {statusCode: 200, body: JSON.stringify(result, null, 4)};
}

export function formatRedirectResponse(url: string): LambdaResponse{
  return {
    statusCode: 302, 
    headers: {"location":url}
  };
}

