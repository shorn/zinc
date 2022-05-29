The Zinc repo is a demonstration for my learning about Cognito and aws-cdk.
Begun as a Proof-of-Concept ("PoC") of Cognito functionality for 
kopi.cloud.

## Functionality

[Try it out](https://d10mxtejtt0tmd.cloudfront.net) - hosted on my own AWS
account.  If that's not working, have a look in `/client/package.json/proxy`-
I may have forgotten to update this doco.

Or I might just not be running the project live any more.  See instructions for
[running your own infrastructure](doc/running-own-infra.md).

If the code is not working on your machine, please let me know in the Github
discussions.

Zinc doesn't do much of anything:
* Login via email, Google, Github, Facebook or Twitter.
  * some IdProviders have two implementations - one through Cognito and
  the other directly to the ID Providers.
  * [access-control.md](/doc/access-control.md) outlines Zinc access control
  * [oauth-oidc.md](/aws-infra/lambda/doc/oauth-oidc.md) is the start point
  for digging into authentication specifics
* Set your own "display name" .
* List all users that have signed up 
  * only lists created date and user-entered "display name", 
    not email or any SSO profile data.


## Project structure

Typescript codebase structured as a monorepo, using NPM to build and deploy.

There's no CI/CD infrastructure, though I may stand up a CDK pipeline one day.

* [aws-infra/](aws-infra)
  * `aws-cdk` project for building the infrastructure
  * [lambda /](aws-infra/lambda)
    * contains all code for the APIs served by Lambda
    * no framework (Serverless, SAM, etc.)
* [client/](client)
  * React based SPA, built with 
  [create-react-app](https://create-react-app.dev/).  
  Uses [MUI](https://mui.com/) as the component library.  
* [doc/](doc)
  * documentation topics to link to from readme files / source code  
* [shared/](shared)
  * placeholder for when I figure out how to actually do this with a 
    create-react-app codebase
  * the actual shared code sits under the `client` project at  
  [/client/src/Shared](/client/src/Shared), see the [readme](/shared/readme.md) 
  for more detail.  


## AWS infrastructure

![architecture](doc/aws-infra.svg "AWS infrastructure")
Diagram by [Cloudcraft](https://www.cloudcraft.co/).
See [aws-infra/readme](aws-infra/readme.md) for more details.
See [running your own infrastructure](doc/running-own-infra.md) for 
instructions on bootstrapping and configuring the whole project in your own 
AWS account. See [infra-cost.md](/doc/infra-cost.md) for info about the cost
of running Zinc in your own AWS account.


## Local development 
* edit the `proxy` setting in [client/package.json](./client/package.json) and
set it to the cloudfront url you've created.
  * if you leave it alone, you will be pointing at my AWS account
* run `client` / `npm start-dev` to start the client locally, the `proxy` setting 
will proxy calls out to the lambda running under cloudfront
  * uses create-react-app hot deploy, so turnaround for code changes is quick 
* run `aws-infra` / `npm run hotswap-all` to force a fast deployment of 
all lambdas
  * turn around for changes is about 10-15 seconds - not great but good enough
  for a demo codebase
  * could also use the CDK - SAM integration for local development, but I 
  haven't dug into it
  * doing a hotswap will also force the lambdas to re-read the config, useful
  if you've changed the config but not the actual lambda code


## Security considerations

There are a lot of shortcuts taken in the Zinc codebase.

See [security-considerations.md](/doc/security-considerations.md) for a list of 
important ones related to security.

