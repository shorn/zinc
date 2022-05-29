Implemented in [DirectGithubAuthnApiHandler.ts](/aws-infra/lambda/src/AuthnApi/DirectGithubAuthnApiHandler.ts)

```mermaid
sequenceDiagram
autonumber
actor user as User
participant app as App
participant lambda as ZincGithub Lambda
participant github as Github.com

user-->>app: user navigates to app
user->>app: user clicks Github login
app-->>user: app navigates browser to<br/>github/login/oauth/authorize
note left of app: {client_id, scope, state.redirect_uri}

user-->>github: browser follows redirect
user->>github: user clicks "authorize Zinc app" 
github-->>user: redirect browser to<br/>lambda/idpresponse
note left of github: {code, state}

user-->>lambda: browser follows redirect
lambda->>lambda: validate state.redirect_uri is in<br/>config.allowedCallbackUrls
lambda->>github: POST /login/oauth/access_token
note right of lambda: {code, client_id, client_secret}
github->>lambda: 
note left of github: {access_token, scope} 
lambda->>lambda: validate scope
lambda->>github: GET /user
note right of lambda: {access_token}
github->>lambda: 
note left of github: {id}
lambda->>github: GET /user/emails
note right of lambda: {access_token}
github->>lambda: 
note left of github: {email[]}
lambda->>lambda: create JWT<br/>signed with config.client_secret
lambda->>user: redirect browser to app<br/>(from {state.redirect_uri}) 
note left of lambda: {id_token}
user-->>app: browser follows redirect
app->>app: parse id_token from url

```
