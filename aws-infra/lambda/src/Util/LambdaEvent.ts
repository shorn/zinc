/** The shape of the event we expect to be passed - was APIGatewayProxyEvent
 * when I was using the API-GW.
 * AFAICT, there is no published model of a "generic" lambda invocation event.
 * <p>
 * I modelled this off of the output of console.log during a GET call to a
 * Lambda FunctionUrl - see bottom of file.
 * <p>
 * Be careful, I may have some of the "optional" modifiers wrong (i.e. I've 
 * assumed something will always be there when it might not).
 * I've also only modelled things I care about/use (i.e. http.method only models
 * GET and POST because I don't use the other methods).
 */
export type LambdaFunctionUrlEvent = {
  rawPath: string;
  rawQueryString: '',
  headers: LambdaEventHeaders,
  body: string|undefined,
  isBase64Encoded: boolean,
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
};

export type LambdaResponse = {
  statusCode: number,
  body: string,
}

/** Copied from APIGatewayProxyEventHeaders */
export interface LambdaEventHeaders {
  [name: string]: string | undefined;
}

export function formatErrorResult(
  statusCode: number,
  message: string,
): LambdaResponse{
  return {
    statusCode,
    body: JSON.stringify({message}),
  };
}

export function formatSuccessResult(result: object): LambdaResponse{
  return {statusCode: 200, body: JSON.stringify(result, null, 4)};
}

/*
2022-04-27T00:06:05.006Z	c6c27284-44fa-4d90-aea1-05c60d329fe2	ERROR	failed to dispatch {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/api-prd-v2/readConfig',
  rawQueryString: '',
  headers: {
    'x-amzn-trace-id': 'Root=1-626888eb-44093f3f5336126b61fe9739',
    'x-forwarded-proto': 'https',
    host: 'xxx.lambda-url.ap-southeast-2.on.aws',
    'x-forwarded-port': '443',
    'content-type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
    'cache-control': 'max-age=0',
    'x-amz-cf-id': '1SorZgawBgL6KKCb2tzzGIfRGlvLuv2SCYxCfwvhsJBJ221RCJH7_g==',
    'user-agent': 'Amazon CloudFront',
    via: '1.1 94cc9b87a8d6ec56cb10581dbf817b78.cloudfront.net (CloudFront)'
  },
  requestContext: {
    accountId: 'anonymous',
    apiId: 'xxx',
    domainName: 'xxx.lambda-url.ap-southeast-2.on.aws',
    domainPrefix: 'xxx',
    http: {
      method: 'GET',
      path: '/api-prd-v2/readConfig',
      protocol: 'HTTP/1.1',
      sourceIp: '64.252.106.173',
      userAgent: 'Amazon CloudFront'
    },
    requestId: 'c6c27284-44fa-4d90-aea1-05c60d329fe2',
    routeKey: '$default',
    stage: '$default',
    time: '27/Apr/2022:00:06:03 +0000',
    timeEpoch: 1651017963145
  },
  isBase64Encoded: false
}

2022-04-27T03:49:12.238Z	93535d26-7147-4072-82f2-11046ad0c126	INFO	post event {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/api-prd-v2/listUser',
  rawQueryString: '',
  headers: {
    authorization: 'Bearer xxx.yyy.zzz',
    'x-amzn-trace-id': 'Root=1-6268bd38-0b078ff37319e9f81668660d',
    'x-forwarded-proto': 'https',
    origin: 'https://xxx.cloudfront.net',
    host: 'xxx.lambda-url.ap-southeast-2.on.aws',
    'x-forwarded-port': '443',
    'content-type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
    'x-amz-cf-id': 'qPVomPFcvQzHUHT9HotcMUSxx5kTtnwoMT_rOH4dvY2r1ZHzxwEVkdrw==',
    'user-agent': 'Amazon CloudFront',
    via: '1.1 360bc380530e42ff8d4114ee99dd6212.cloudfront.net (CloudFront)'
  },
  requestContext: {
    accountId: 'anonymous',
    apiId: 'xxx',
    domainName: 'xxx.lambda-url.ap-southeast-2.on.aws',
    domainPrefix: 'xxx',
    http: {
      method: 'POST',
      path: '/api-prd-v2/listUser',
      protocol: 'HTTP/1.1',
      sourceIp: '64.252.174.135',
      userAgent: 'Amazon CloudFront'
    },
    requestId: '93535d26-7147-4072-82f2-11046ad0c126',
    routeKey: '$default',
    stage: '$default',
    time: '27/Apr/2022:03:49:12 +0000',
    timeEpoch: 1651031352205
  },
  body: '{}',
  isBase64Encoded: false
}

 */