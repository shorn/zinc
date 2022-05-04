The Github support is a custom shim, based off of:
https://github.com/TimothyJones/github-cognito-openid-wrapper

Note that the Zinc implementation is not meant to be a reusable, generic OIDC
wrapper; it's just the simplest thing that will work for the use-case of
allowing a Github login to the Zinc app.

* it only supports public github, not enterprise
* id_token is signed with the Github `client_secret` configured in Cognito
  instead of a certificate
  * Zinc signature: HS256, symmetric signing based on the shared client_secret
    configured in the Cognito UserPool.
  * openid-wrapper signature: RS256, asymmetric signing using private/public
    keys, validated via the certificates published via JWKS standard.
* supports only the OIDC attributes that Zinc needs, not the full standard set

The Lamba implementation is in
[LambdaGithubOidcApiV1.ts](/aws-infra/lambda/src/LambdaGithubOidcApiV1.ts).

The AWS CDK setup for Github is in
[CognitoGithubStackV1.ts](/aws-infra/src/Stack/CognitoGithubStackV1.ts)

### Authentication flow

```mermaid
sequenceDiagram
    autonumber
    actor user as User
    participant client as Client
    participant cognito as Cognito
    participant lambda as OIDC Lambda
    participant github as Github.com
    
    user-->>client: navigate to client
    user->>client: click Github login
    client-->>user: redirect browser to cognito/login
    user-->>cognito: follow redirect
    user->>cognito: click "sign in with Corp ID"
    cognito-->>user: redirect browser to lambda/authorize
    note left of cognito: {client_id, scope}
    user-->>lambda: follow redirect
    lambda-->>user: redirect browser to github/login/oauth/authorize
    note left of lambda: {client_id, scope}
    user-->>github: follow redirect
    user->>github: click "authorize Zinc app"
    github-->>user: redirect to cognito/oauth2/idpresponse
    note left of github: {code}
    user-->>cognito: follow redirect
    cognito->>lambda: GET /token
    note right of cognito: {code, client_id, client_secret}
    lambda->>github: POST /login/oauth/access_token 
    note right of lambda: {code, client_id, client_secret}
    github->>lambda: 
    note left of github: {access_token}
    lambda->>lambda: create JWT id_token
    note right of lambda: signed with client_secret
    lambda->>cognito: 
    note left of lambda: {access_token, id_token}    
    cognito->>cognito: validate access_token / id_token
    cognito->>lambda: GET /userinfo
    note right of cognito: {access_token}
    lambda->>github: GET /user
    note right of lambda: {access_token}
    github->>lambda: 
    note left of github: {id}
    lambda->>github: GET /user/emails
    note right of lambda: {access_token}
    github->>lambda: 
    note left of github: {email[]}
    lambda->>cognito: 
    note left of lambda: {sub, email, email_verified}
    cognito->>cognito: create new JWT with mapped claims
    note right of cognito: signed with JWKS certificate
    cognito-->>user: redirect to client
    note left of cognito: {id_token}
    user-->>client: follow redirect
    client->>client: parse id_token from url

```

### Zinc Authorization

This part has nothing to do with Github or OIDC - I don't want to add it to the
diagram since it's non-standard and the diagram is already too complicated.

After the `id_token` is parsed out by the client, it is sent to the
`zinc/authorize` url to be exchanged for a Zinc `accessToken`. Zinc validates
the JWT `id_token` using the certificate published by Cognito at the JWKS
standard URL.

----

https://mermaid-js.github.io/mermaid/#/sequenceDiagram
