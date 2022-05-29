See [access-control.md](/doc/access-control.md) for information about about
authn/authz and Zinc access control.


## Authorization code grant type

Zinc does not use the recommended "PKCE" grant type (I think only Google
implements it anyway).  Zinc generally uses the "Authorization Code" grant
type, with the "confidential client" part implemented on the server-side
via AWS Lambda, see
[oauth-oidc.md](/aws-infra/lambda/doc/oauth-oidc.md).

None of the direct authentication methods use anything except the minimal
code that works to sign-in (no CSRF tokens, no nonces, etc.)


## Access token stored in local storage

The accessToken is stored in local-storage, not as a secure http cookie -
so there's no implementaiton of CSRF prevention.
* I'm personally fine with this, but some people think it's "not the way"
* if you want to use a cookie, you'll need to make sure it's secure,
  http-only, and implement a CSRF prevention strategy


## Access token contains PII

PII = Personally Identifiable Information

The accessToken contains PII (`email` claim), which is bad practice for an
access token, particularly when storing it in client storage.

This is pure laziness on my part, the email is used for two things:
* used when logging problems, facilitates diagnosis and monitoring
  * solution: implement a debug lookup utility to add the email to logs
  * solution won't be viable sometimes and you'll just have to use the userId to
    figure things out
  * email isn't even exact, you have to log the userId anyway because it's
    possible for a user to use multiple IdP's using same email address.
* used to display the email in the "Account" widgent (top right of screen)
  * solution: implement a proper user details lookup endpoint instead of
    using the claim directly
    * the endpoint for this does exist now (`/readUser`), I just haven't
      refactored


## IdProvider id leakage

The direct login implementation leaks the unique-ID that providers use to
identify a user - e.g. if you login and go to the user list, you can find out
my Github and Google unique id

I don't know what the threat vector for this would be, seems innocuous to
me - but worth pointing out.


## Backend needs more logic and testing

The backend authentication and authorization code needs lots more
logic (and testing) of checking and verifying claims, scopes, etc.

Needs to test algorithm stuff:
* prove that we don't accept `alg:none`
* prove that we don't accept `alg:hs256` where the token is actually signed
  with the public key of an RS256 pair (yup, there've been multiple library
  implementations that've done that)


## Secrets stored in plain SSM params

This is done for cost, AWS App Config and Secrets Manager cost money I
don't want to pay for a demo code base.

If you're adapting any of this code for real, you should not store
  secrets in SSM.

## ID tokens from IdProviders are passed back to client
The various sign-in methods just pass through the id_token from the
provider back to the client and then it's left to the "authorize" logic in
the ZincApi to verify them appropriately
* a better design would be for each sign-in method to normalize to a custom
  Zinc id_token format and signature algorithm.  This would simplify the authz
  logic and simplify the configuration of the authz lambda.
* Turns out AWS KMS has an always-free tier, so could even use RS256 for
  securing the access token.  It would be a chunk of implementation - but
  definitely worth the effort in a real system.

## Secrets are logged to CloudWatch
The various lambda handlers all use the method `DANGERouslyLogEvent()`, which
logs all event parameters to CloudWatch.
See [LambdaEvent.ts](/aws-infra/lambda/src/Util/LambdaEvent.ts)

Please feel free to create Github issues, pull requests or discussion topics
regarding these or other security considerations you'd like to talk about.


## Cognito identity-pool vs user-pool

Note that, for this repo, I was only interested in learning how to use
Cognito to authenticate users. For this use-case, I'm not interested in
using AWS resources directly or managing authorization via AWS IAM - so Zinc
does not use Cognito identity-pools, only user-pools.

Note that if you want to use Cognito but not do your own authorization,
you will need to use Cognito identity-pools.
The Cognito "id token" expiry can only be set up to 24 hours, but identity-pool
"access tokens" can be refreshed for up to 30 days.

It's really not a good idea to keep id tokens around for a long time -
especially don't store them in local storage, cookies, etc.


