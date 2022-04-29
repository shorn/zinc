## Structure

![architecture](../doc/aws-infra.svg)
Diagram by [Cloudcraft](https://www.cloudcraft.co/).

The AWS CDK entry point is [src/Main.ts](src/Main.ts), this instantiates the
components shown in the diagram from the stack classes
under [src/Stack](src/Stack)

The implementation code for the LambdaApi is contained in the
[lambda](lambda) package - it has it's own `package.json`, but is not completely
standalone (it has some relative references back out to the Stack code - I hope
to get rid of those at some point.)

## Building

* before you can run the `diff` or `deploy` scripts, you must run the 
[`client`](../client/package.json) `build-prd` script to build the client app
code or the `aws-infra` build will fail saying it couldn't find those files.
* run `npm diff` to compile the project and look for any changes that need to 
be made to the AWS infrastructure to bring it in line with the codebase
* run `npm deploy` to make changes to the AWS infrastrucure
* run `npm hotswap-lambda` to do a quick deploy of Lambda code (10 - 15 
seconds)

## Paths

I like absolute paths for my imports, got the implementation from:
https://github.com/moltar/cdk-ts-path-mapping
