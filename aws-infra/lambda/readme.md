# Structure

* [src/LambdaApiV2.ts](src/LambdaApiV2.ts)
  * The lambda handler definition. It "dispatches" to various implementation 
  functions. 
  * The `api` constant defines how the `ApiMap` defined in the shared 
  [ApiTypes.ts](../../shared/ApiTypes.ts) maps to implementations.
* [/src/Api](src/Api) 
  * Individual functions that implement "API calls".
* [/src/Db](src/Db)
  * The logic for reading/writing with DynamoDb using 
  [dynamodb-onetable](https://github.com/sensedeep/dynamodb-onetable).
* [/src/Jwt](src/Jwt)
  * Needs renaming, contins logic for verifying idTokens and turning them into
  accessTokens.

# Tests

## Relative paths from importing prod code into a test
Unforutnately, the tests use very ugly relative paths to import the prod lambda 
code, like : `import { X } from "../../lambda/src/Db/X";` 

One way to fix is to add this to `jest.config.js`:
`moduleDirectories: ['node_modules', '../../lambda/src/']`.
The above works so you can do `import { X } from "Db/X"`, but IDEA doesn't 
know about it so you get constant error warnings, and the IDE will keep 
generating relative imports.

## Absolute imports in prod code at test runtime

Originally, absolute imports in the Lambda code were working everywhere except
when running a test.

The fix was to add the following line to the `jest.confg.js`:
`moduleDirectories: ['node_modules', 'src']`.
`node_modules` is default, it's adding the `src` entry that made the tests run.
See [this SO answer](https://stackoverflow.com/a/51174924/924597).

## Test config to try

Stuff that might work the way I want, but I haven't tried yet.

* https://til.hashrocket.com/posts/lmnsdtce3y-import-absolute-paths-in-typescript-jest-tests


# Dynamo ORMs investigated

## dynamodb-onetable

https://github.com/sensedeep/dynamodb-onetable

This is what the lambda code currently uses for working with DynamoDB.

* example code shows a one-off setup process `Table.create()` is the usual 
flow - obviously, that doesn't work with doing stuff in CDK (e.g. giving 
lambda read access to table).
  * I integrated by just eyeballing a `Table.create()` table and modifying the 
  CDK code until the two looked the same and the test seemed to work.
  * I do wonder if you could integrate the onetable code with CDK somehow.
* error messages were really poor, if you didn't already know what mistake
you made, you'd never know from the error message.  This one would likely
be a blocker for me in terms of adoption on a real project.
* I eventually got the "find" operation working, but it was trial and error,
no idea what I'm doing and the doco wasn't much help.  Another big issue, but
this might be mitigated by me just learning WTF I'm doing with DDB.


# ORMs discarded

## ddb-table
https://github.com/neuledge/ddb-table

Really liked the API for this, but didn't work with AWS credential profiles
for working locally.

