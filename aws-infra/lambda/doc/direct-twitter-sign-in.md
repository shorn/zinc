Implemented in [DirectTwitterAuthnApiHandler.ts](/aws-infra/lambda/src/AuthnApi/DirectTwitterAuthnApiHandler.ts)

Based off [expo-twitter-login-example](https://github.com/expo/expo-twitter-login-example)
but with a lot of changes because that code is quite fragile (hand-coded for 
parameter order) and the [createSignature()](https://github.com/expo/expo-twitter-login-example/blob/master/twitter-login-backend/index.js#L143) 
method is flat-out broken for signing user user requests (it uses the 
`encodedRequestURL ` in the `signingKey`, should be the `tokenSecret`).

```mermaid
sequenceDiagram
autonumber
actor user as User
participant client as Client
participant lambda as DirectTwitter<br/>Lambda
participant idp as api.twitter.com

user->>client: user navigates to client
user->>client: user clicks Twitter login button
client-->>user: 302 redirect to lambda/authorize
note left of client: {state.redirect_uri}

user-->>lambda: browser follows redirect
lambda->>lambda: validate state.redirect_uri is allowed (from config)
lambda->>idp: POST /request_token
note right of lambda: {oauth_consumer_key,<br/>callback_url,<br/>state.redirect}<br/>signed with consumer_secret 
idp->>lambda: 
note left of idp: {oauth_token}
lambda-->>user: 302 redirect to twitter/authenticate
note left of lambda: {oauth_token}

user-->>idp: browser loads page
user->>idp: user clicks "authorize Zinc app" 
idp-->>user: 302 redirect to lambda/idpresponse
note left of idp: {oauth_token, oauth_verifier, state}
user-->>lambda: browser follows redirect
lambda->>lambda: validate state.redirect_uri is allowed (from config)
lambda->>idp: POST /access_token
note right of lambda: {oauth_consumer_key,<br/>oauth_token}<br/>signed with consumer_secret
idp->>lambda: 
note left of idp: {oauth_token,<br/>oauth_token_secret,<br/>user_id,<br/>screen_name} 
lambda->>idp: GET /user
note right of lambda: {oauth_consumer_key,<br/>oauth_token,<br/>include_email}<br/>signed with<br/>oauth_token_secret & consumer_secret
idp->>lambda: 
note left of idp: {id, email, screen_name}
lambda->>lambda: create JWT, signed with config.idTokenSecret

lambda->>user: 302 redirect to client (from state.redirect_uri) 
note left of lambda: {id_token}
user-->>client: browser follows redirect
client->>client: parse id_token from url

```
