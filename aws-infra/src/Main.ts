#!/usr/bin/env node
import 'source-map-support/register';
import { App, StackProps, } from "aws-cdk-lib";
import { LambdaStack } from "Stack/LambdaStack";
import { CloudFrontStack } from "Stack/CloudFrontStack";
import { CognitoEmailStack } from "Stack/CognitoEmailStack";
import { CognitoGoogleStackV2 } from "Stack/CognitoGoogleStackV2";
import { CloudFrontStackV3 } from "Stack/CloudFrontStackV3";
import { LambdaStackV3 } from "Stack/LambdaStackV3";
import { CredentialSsmStack } from "Stack/CredentialSsmStack";
import { CognitoGoogleStackV3 } from "Stack/CognitoGoogleStackV3";
import { CredentialSsmStackV2 } from "Stack/CredentialSsmStackV2";

const main = new App();

// Current Prd stacks
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


// to be deleted 


// WIP stacks
//const creds = new CredentialSsmStack(main, `CredentialSsmStack`, {
//  ...usEast1StackProps(),
//});

const creds = new CredentialSsmStackV2(main, `CredentialSsmStackV2`, {
  ...usEast1StackProps(),
});

const cloudfront3 = new CloudFrontStackV3(main, 'CloudFrontStackV3', {
  ...usEast1StackProps(),
  creds: creds
});

new CognitoGoogleStackV3(main, 'CognitoGoogleStackV3',{
  ...usEast1StackProps(),
  callbackUrls: [
    // port defined in /client/.env 
    "http://localhost:9090",
    `https://${(cloudfront3.newDistro.distributionDomainName)}`,
  ],
  domainPrefix: "cog-poc-google3", // unique?
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

/*
Because cloudfront demands functions be in us-east-1, then CDK demands that
all cross-stack references be in the same region.
 */
function usEast1StackProps(): StackProps{
  return {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "us-east-1",
    },
    tags: {
      ManagedBy: "github.com/shorn/cognito-poc/aws-infra",
    },
  }
}

