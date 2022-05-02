The Github support is a custom shim, based off of: 
https://github.com/TimothyJones/github-cognito-openid-wrapper

The Zinc implementation is cut down from the wrapper though, it's not 
really an "OIDC wrapper" so much as a "do the simplest possible thing I can
to get it going".
* it only supports public github, not enterprise
* id_token is signed with HS256 (symmetric signing based on shared secret) 
  instead of RS256 (asymmetric signing, using JWKS certificate standard)
* supports only the OIDC attributes that Zinc needs, not the full standard set

The Lamba implementation is in 
[LambdaGithubOidcApiV1.ts](/aws-infra/lambda/src/LambdaGithubOidcApiV1.ts).

The AWS CDK setup for Github is in 
[CognitoGithubStackV1.ts](/aws-infra/src/Stack/CognitoGithubStackV1.ts)

```mermaid
sequenceDiagram
participant client as Client
participant cognito as Cognito
client -> cognito
```