This is the url that github.come/authorize did a 302 redirect to 
after accepting to login to Zinc.  Cognito then calls our functionUrl /token
endpoint.

```shell
curl 'https://<UserPoolDomain>.auth.<Region>.amazoncognito.com/oauth2/idpresponse
?code=<data>
&state=<StateData>' 
-H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0' 
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8' 
-H 'Accept-Language: en-US,en;q=0.5' 
-H 'Accept-Encoding: gzip, deflate, br' 
-H 'Referer: https://<UserPoolDomain>.auth.<Region>.amazoncognito.com/' 
-H 'Connection: keep-alive' 
-H 'Cookie: XSRF-TOKEN=<UUID>; csrf-state=<data>; csrf-state-legacy=<data>' 
-H 'Upgrade-Insecure-Requests: 1' 
-H 'Sec-Fetch-Dest: document' 
-H 'Sec-Fetch-Mode: navigate' 
-H 'Sec-Fetch-Site: cross-site' 
-H 'Sec-Fetch-User: ?1' 
-H 'TE: trailers'
```

StateData was url encode base 64, which decoded to a ':' separated string
`<DataPart1>:sokDIJyhJT4nnowPBwO944ZBRVNUZjushzdu03OdGjU=:3`

:Dunno what part 2 and 3 are, but part1 was another base64 encoded string:
```json
{
    "userPoolId":"<UserPool Id>",
    "providerName":"<UserPool IdentityProviderName>",
    "clientId":"<UserPool ClientId>",
    "redirectURI":"http://localhost:9090",
    "responseType":"token",
    "providerType":"OIDC",
    "scopes":["email","openid","profile"],
    "state":null,
    "codeChallenge":null,
    "codeChallengeMethod":null,
    "nonce":"<data>",
    "serverHostPort":"<UserPoolDomain>.auth.<Region>.amazoncognito.com",
    "creationTimeSeconds":1651364318,
    "session":null,
    "userAttributes":null,
    "stateForLinkingSession":false
}
```