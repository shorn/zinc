
The term [Access control](https://en.wikipedia.org/wiki/Computer_access_control) 
covers many concepts including _identificaiton_, _authentication_ and 
_authorization_. 

## Identification and trust

Note that Zinc doesn't do _identification_, it trusts that the 
IdProvider (Cognito, Google, Facebook, etc.) has previously _identified_ the 
user that they are providing the _authentication_ for. 
For example, with email - it's the Cognito system that tracks with email goes 
with which password and does the "email confirmation" process for verifying 
that the user does actually control the email address.  
Zinc doesn't take part in that process, Zinc doesn't check passwords and it 
doesn't confirm emails  - it trusts Cognito's identification process.  
Same for all the other IdProviders Facebook, Twitter, etc.

The authentication process may even comprise a "chain of trust", 
i.e Zinc trusts Cognito and Cognito trusts that Google have identified the user.


## Authentication - "who are they?"

Authentication is the process of identifying who it is that is using the system.

* Authentication says nothing about what a user can do, not even if they're 
  allowed to use system at all or not
* Generally, authentication has nothing to do with a speicif app - 
  the identity of a person is not dependendant or related to what systems 
  they use or what permissions the may be allocated.

## Authorization - "what can they do?"

The purpose of authorization is to make sure that all user/process 
interactions obey that app's specific rules.

* Are they allowed to use the app at all?
  Are they an administrator?
  What can they see, what can they do?
  Can they edit data, which data, what about other people's data?
* Authorization is app-dependant, any similarities between how different apps
  do authorization is coincidental.

Authorization also covers the process of validating each invocation of an 
endpoint to make sure that it obeys the access conrol rules of the app.
Sometimes you will see folks use the term "access control" to refer specifically
to the logic of protecting individual resources.


## Zinc access control

### Zinc Authn vs Authz

The only area where the the concerns of *authentication* and *authorization*
overlap is when the app client exchanges the "id token" for an "access token", 
see [AuthorizeUser.ts](/aws-infra/lambda/src/ZincApi/AuthorizeUser.ts).

After Zinc has authenticated a user and obtained an "id token" that 
*authenticates* the user's *identity* - it then exchanges the "id token" for a 
completely separate JWT-based "access token" for actually authorizing 
Zinc API endpoints.

The "access token" has nothing to do with Cognito, or social sign in.
The "access token" is purely about *authorizing* an *authenticated* user to call
Zinc API endpoint.  The access token contains the `email` claim purely for
convenience (logging, etc.), actual authorization logic is based off of 
the `userId` claim, see 
[GuardAuthz.ts](/aws-infra/lambda/src/ZincApi/Authz/GuardAuthz.ts)

### Zinc Access aproval
Zinc auto-approves new users (i.e. nobody "approves" users of the app)
but this appoval can be revoked by going into the database and setting the
`enabled`/`denyAuthBefore` attributes - this will immediately deny that user
identity from using the system (not technically the "user though - what if they
signed up using multiple IdProviders, or even just multiple email addresses?)
See [guardGenericAuthz()](/aws-infra/lambda/src/ZincApi/Authz/GuardAuthz.ts).

### Zinc auditing

None.



 