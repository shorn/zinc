See [access-control.md](/doc/access-control.md) for information about about
authn/authz and Zinc access control.

See [oauth-oidc.md](/doc/oauth-oidc.md) for some high-level discussion about
oauth and the authentication flow.
x
## Structure

* [/src/ZincApi/](src/ZincApi)
  * Individual functions that implement "Zinc API".
  * [ZincApiHandler.ts](src/ZincApi/ZincApiHandler.ts)
    * entry point for the ZincApi lambda
    * handles "business logic", including authorization
* [src/AuthnApi](src/AuthnApi)
  * various lambdas for handling authentication
  * [CognitoGithubOidcApiHandler.ts](src/AuthnApi/CognitoGithubOidcApiHandler.ts)
    * publishes a set of endpoints that map Github's OAuth API to the 
    standard OIDC endpoints (Github doesn't support OIDC)
    * see [cognito-github.md](/aws-infra/lambda/doc/cognito-github.md)
  * [DirectGoogleAuthnApiHandler.ts](src/AuthnApi/DirectGoogleAuthnApiHandler.ts)
    * publishes a callback url that Google can redirect the browser to as part
    of the direct authentication flow
  * [DirectGithubAuthnApiHandler.ts](src/AuthnApi/DirectGithubAuthnApiHandler.ts)
    * publishes a callback url that Github can redirect the browser to as part
    of the direct authentication flow
    * see [direct-github-sign-in.md](/aws-infra/lambda/doc/direct-github-sign-in.md)
  * [DirectTwitterAuthnApiHandler.ts](src/AuthnApi/DirectTwitterAuthnApiHandler.ts)
    * publishes an /authorize url that the client calls to redirect to the twitter/authenticate url
      (required by Twitter's OAuth1 flow) and the callback url that Twitter 
      redirects the browser to as part of the direct authentication flow
    * see [direct-twitter-sign-in.md](/aws-infra/lambda/doc/direct-twitter-sign-in.md)
* [/src/Db/](src/Db)
  * The logic for reading/writing with DynamoDb using 
  [dynamodb-onetable](https://github.com/sensedeep/dynamodb-onetable).
* [/src/ZincApi/Authz/](src/ZincApi/Authz)
  * Contains logic for "authorizing" an "authenticated" user.  That is,
  verifying idTokens as a valid JWT issued by Cognito or the IdProvider, 
    verifying the identity contained against our DB and generating an 
  * accessToken for making API calls.
* [/doc/](doc)
  * notes about authentication request flows
  * [/doc/lambda-event/](doc/lambda-event)
    * notes about observed examples of various API calls


## Tests

### Relative paths from importing prod code into a test
Unforutnately, the tests use very ugly relative paths to import the prod lambda 
code, like : `import { X } from "../../lambda/src/Db/X";` 

One way to fix is to add this to `jest.config.js`:
`moduleDirectories: ['node_modules', '../../lambda/src/']`.
The above works so you can do `import { X } from "Db/X"`, but IDEA doesn't 
know about it so you get constant error warnings, and the IDE will keep 
generating relative imports.

### Absolute imports in prod code at test runtime

Originally, absolute imports in the Lambda code were working everywhere except
when running a test.

The fix was to add the following line to the `jest.confg.js`:
`moduleDirectories: ['node_modules', 'src']`.
`node_modules` is default, it's adding the `src` entry that made the tests run.
See [this SO answer](https://stackoverflow.com/a/51174924/924597).

### Test config to try

Stuff that might work the way I want, but I haven't tried yet.

* https://til.hashrocket.com/posts/lmnsdtce3y-import-absolute-paths-in-typescript-jest-tests


## Dynamo ORMs investigated

### dynamodb-onetable

https://github.com/sensedeep/dynamodb-onetable

This is what the lambda code currently uses for working with DynamoDB.

* Example code shows a one-off setup process `Table.create()` is the usual 
flow - obviously, that doesn't work with doing stuff in CDK (e.g. giving 
lambda read access to table).
  * I integrated by just eyeballing a `Table.create()` table and modifying the 
  CDK code until the two looked the same and the test seemed to work.
  * I do wonder if you could integrate the onetable code with CDK somehow.
* Error messages are really poor; if you didn't already know what mistake
you made, you'd never know from the error message.  This one would likely
be a blocker for me in terms of adoption on a real project.
* I eventually got the "find" operation working, but it was trial and error,
no idea what I'm doing and the doco wasn't much help.  Another big issue, but
this might be mitigated by me just learning what I'm doing with DDB.


## ORMs discarded

### ddb-table
https://github.com/neuledge/ddb-table

Really liked the API for this, but didn't work with AWS credential profiles
for working locally.

