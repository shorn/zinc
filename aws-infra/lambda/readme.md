
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

* example code shows a one-off setup process `Table.create()` is the usual 
flow - obviously, that doesn't work with doing stuff in CDK (e.g. giving 
lambda read access to table).
  * I integrated by just eyeballing a `Table.create()` table and modifying the 
  CDK code until the two looked the same and the test seemed to work.
* error messages were really poor, if you didn't already know what mistake
you made, you'd never know from the error message
* I eventually got the "find" operation working, but it was trial and error,
no idea what I'm doing and the doco wasn't much help.


# ORMs discarded

## ddb-table
https://github.com/neuledge/ddb-table

Really liked the API for this, but didn't work with AWS credential profiles
for working locally.

