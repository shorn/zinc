```json
{
  "version": "2.0",
  "routeKey": "$default",
  "rawPath": "/userinfo",
  "rawQueryString": "",
  "headers": {
    "authorization": "Bearer <AccessToken>",
    "x-amzn-trace-id": "Root=1-626e1a95-2ead27d30a28e7cf04da38a7",
    "x-forwarded-proto": "https",
    "host": "xxx.lambda-url.ap-southeast-2.on.aws",
    "x-forwarded-port": "443",
    "x-forwarded-for": "13.54.157.13",
    "accept-encoding": "gzip,deflate",
    "user-agent": "Amazon/Cognito"
  },
  "requestContext": {
    "accountId": "anonymous",
    "apiId": "xxx",
    "domainName": "xxx.lambda-url.ap-southeast-2.on.aws",
    "domainPrefix": "xxx",
    "http": {
      "method": "GET",
      "path": "/userinfo",
      "protocol": "HTTP/1.1",
      "sourceIp": "13.54.157.13",
      "userAgent": "Amazon/Cognito"
    },
    "requestId": "52189981-896e-40fc-9de0-bfbe732896ae",
    "routeKey": "$default",
    "stage": "$default",
    "time": "01/May/2022:05:28:53 +0000",
    "timeEpoch": 1651382933166
  },
  "isBase64Encoded": false
}
```

`AccessToken` is the value we passed back from the `/token` endpoint, which
was passed pack from github.