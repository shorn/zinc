```
{
  "version": "2.0",
  "routeKey": "$default",
  "rawPath": "/authorize",
  "rawQueryString": "client_id=xxx&redirect_uri=https%3A%2F%2Fxxx.auth.ap-southeast-2.amazoncognito.com%2Foauth2%2Fidpresponse&scope=openid+read%3Auser+user%3Aemail&response_type=code&state=xxx",
  "headers": {
    "sec-fetch-mode": "navigate",
    "referer": "https://xxx.auth.ap-southeast-2.amazoncognito.com/",
    "sec-fetch-site": "cross-site",
    "accept-language": "en-US,en;q=0.5",
    "x-forwarded-proto": "https",
    "x-forwarded-port": "443",
    "x-forwarded-for": "159.196.12.234",
    "sec-fetch-user": "?1",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "x-amzn-trace-id": "Root=1-626cb93d-2e4874821064aad138b39c90",
    "host": "xxx.lambda-url.ap-southeast-2.on.aws",
    "upgrade-insecure-requests": "1",
    "accept-encoding": "gzip, deflate, br",
    "sec-fetch-dest": "document",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0"
  },
  "queryStringParameters": {
    "scope": "openid read:user user:email",
    "response_type": "code",
    "redirect_uri": "https://xxx.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse",
    "state": "xxx",
    "client_id": "xxx"
  },
  "requestContext": {
    "accountId": "anonymous",
    "apiId": "xxx",
    "domainName": "xxx.lambda-url.ap-southeast-2.on.aws",
    "domainPrefix": "xxx",
    "http": {
      "method": "GET",
      "path": "/authorize",
      "protocol": "HTTP/1.1",
      "sourceIp": "159.196.12.234",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0"
    },
    "requestId": "99dbd440-f98c-48be-930c-5064535566de",
    "routeKey": "$default",
    "stage": "$default",
    "time": "30/Apr/2022:04:21:17 +0000",
    "timeEpoch": 1651292477799
  },
  "isBase64Encoded": false
}
```