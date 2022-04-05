#!/usr/bin/env node
import 'source-map-support/register';
import { App, StackProps, } from "aws-cdk-lib";
import { LambdaStack } from "Stack/LambdaStack";
import { CloudFrontStack } from "Stack/CloudFrontStack";
import { CognitoEmailStack } from "Stack/CognitoEmailStack";
import { CognitoGoogleStackV2 } from "Stack/CognitoGoogleStackV2";

const main = new App();

new LambdaStack(main, 'LambdaStack', agnosticStackProps());

new CognitoEmailStack(main, 'CognitoEmailStack', agnosticStackProps());

const cloudfront = new CloudFrontStack(main, 'CloudFrontStackV2', boundStackProps());
new CognitoGoogleStackV2(main, 'CognitoGoogleStackV2',{
  ...boundStackProps(),
  callbackUrls: [
    // port defined in /client/.env 
    "http://localhost:9090",
    `https://${(cloudfront.cfDistro.distributionDomainName)}`,
  ],
  domainPrefix: "cog-poc-google2", // unique?
});

function agnosticStackProps(){
  return {
    tags: {
      ManagedBy: "github.com/shorn/cognito-poc/aws-infra",
    },
  }
}

function boundStackProps(): StackProps{
  return {
    /* Note, using CDK node vars like this is special: 
     https://docs.aws.amazon.com/cdk/v2/guide/environments.html */
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    tags: {
      ManagedBy: "github.com/shorn/cognito-poc/aws-infra",
    },
  }
}

