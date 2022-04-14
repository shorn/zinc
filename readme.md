This repo is for learning about Cognito and aws-cdk.
It is a pure Typescript codebase, using NPM to build.

# Structure

* [aws-infra/](aws-infra/readme.md)
  * `aws-cdk` project for building the infrastructure
  * [lambda /](aws-infra/lambda/readme.md)
    * contains all code for the API served by Lambda  
* [client/](client)
  * React based SPA, using Material UI for components 
* [doc/](doc)
  * documentation topics to link to from readme files / source code  
* [shared/](shared)
  * Types shared between `client` and `aws-infra`
  * in a real app, I'd likely use an IDL such as  jsonschema or similar 

# AWS infrastructure

![architecture](doc/aws-infra.svg)
Diagram by [Cloudcraft](https://www.cloudcraft.co/).
See [aws-infra/readme](aws-infra/readme.md) for more details.
See [running your own infrastructure](doc/running-own-infra.md) for 
instructions on bootstrapping and configuring the whole project in your own 
AWS account.

# Local development 
* edit the `proxy` setting in [client/package.json](./client/package.json) and
set it to the cloudfront url you've created.
  * if you leave it alone, you will be pointing at my AWS account 
* run `client` / `npm start-dev` to start the client locally, the `proxy` setting 
will proxy calls out to the lambda running under cloudfront
* run `aws-infra` / `npm run hotswap-cloudfront` to do a fast deployment of 
changed lambda code


