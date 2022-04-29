The Zinc repo is for my learning about Cognito and aws-cdk.
Begun as a Proof-of-Concept ("PoC") of Cognito functionality for 
https://kopi.cloud.


## Functionality

[Try it out](https://d3q1l9etnq2dqk.cloudfront.net) - hosted on my own AWS 
account.  If that's not working, have a look in `/client/package.json/proxy`- 
I may have forgotten to update this doco.

Or I might just not be running the project live any more.  See instructions for 
[running your own infrastructure](doc/running-own-infra.md).

It doesn't do much of anything:
* Login via email or Google.
* Set your own "display name" .
* List all users that have signed up 
  * only lists created date and user-entered "display name", 
  not email or any SSO profile data.

## Project structure

It's all Typescript, structured as a monorepo, using NPM to build and deploy.

There's no CI/CD infrastructure, though I may stand up a CDK pipeline one day.

* [aws-infra/](aws-infra)
  * `aws-cdk` project for building the infrastructure
  * [lambda /](aws-infra/lambda)
    * contains all code for the API served by Lambda  
* [client/](client)
  * React based SPA, using Material UI for components 
* [doc/](doc)
  * documentation topics to link to from readme files / source code  
* [shared/](shared)
  * Code shared between `client` and `aws-infra`
  * in a real app, I'd generate the API types from an IDL such as jsonschema or 
  similar 


## AWS infrastructure

![architecture](doc/aws-infra.svg)
Diagram by [Cloudcraft](https://www.cloudcraft.co/).
See [aws-infra/readme](aws-infra/readme.md) for more details.
See [running your own infrastructure](doc/running-own-infra.md) for 
instructions on bootstrapping and configuring the whole project in your own 
AWS account.

## Local development 
* edit the `proxy` setting in [client/package.json](./client/package.json) and
set it to the cloudfront url you've created.
  * if you leave it alone, you will be pointing at my AWS account
* run `client` / `npm start-dev` to start the client locally, the `proxy` setting 
will proxy calls out to the lambda running under cloudfront
  * uses create-react-app hot deploy, so turnaround for code changes is quick 
* run `aws-infra` / `npm run hotswap-cloudfront` to do a fast deployment of 
changed lambda code
  * turn around for changes is about 10-15 seconds - not great but good enough
  for a demo codebase
  * could also use the CDK - SAM integration for local development, but I 
  haven't dug into it


