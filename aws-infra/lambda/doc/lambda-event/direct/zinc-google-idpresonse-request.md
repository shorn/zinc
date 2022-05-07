```json
{
  "version": "2.0",
  "routeKey": "$default",
  "rawPath": "/google-idpresponse",
  "rawQueryString": "state=<base64 data>&code=<url encoded data>&scope=email+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=consent",
  "headers": {
    "sec-fetch-mode": "navigate",
    "referer": "https://accounts.google.com/",
    "sec-fetch-site": "cross-site",
    "accept-language": "en-US,en;q=0.5",
    "x-forwarded-proto": "https",
    "x-forwarded-port": "443",
    "x-forwarded-for": "159.196.12.234",
    "sec-fetch-user": "?1",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "x-amzn-trace-id": "Root=1-6274a768-7014ca3762ba450a5b61480a",
    "host": "xxx",
    "upgrade-insecure-requests": "1",
    "accept-encoding": "gzip, deflate, br",
    "sec-fetch-dest": "document",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0"
  },
  "queryStringParameters": {
    "code": "<data>",
    "scope": "email openid https://www.googleapis.com/auth/userinfo.email",
    "state": "<data>",
    "prompt": "consent",
    "authuser": "0"
  },
  "requestContext": {
    "accountId": "anonymous",
    "apiId": "xxx",
    "domainName": "xxx.lambda-url.ap-southeast-2.on.aws",
    "domainPrefix": "xxx",
    "http": {
      "method": "GET",
      "path": "/google-idpresponse",
      "protocol": "HTTP/1.1",
      "sourceIp": "159.196.12.234",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0"
    },
    "requestId": "78c1a195-9fb2-4be2-b8c7-3b5330ccd322",
    "routeKey": "$default",
    "stage": "$default",
    "time": "06/May/2022:04:43:20 +0000",
    "timeEpoch": 1651812200431
  },
  "isBase64Encoded": false
}

```
