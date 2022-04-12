#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { CloudFrontStackV3 } from "Stack/CloudFrontStackV3";
import { CognitoGoogleStackV3 } from "Stack/CognitoGoogleStackV3";
import { CredentialSsmStackV2 } from "Stack/CredentialSsmStackV2";
import { usStackProps } from "Util/Shared";
import { UserTableV1 } from "Stack/UserTableV1";

const main = new App();

// Current Prd stacks
const creds = new CredentialSsmStackV2(main, `CredentialSsmStackV2`, {
  ...usStackProps(),
});

const userTableV1 = new UserTableV1(main, 'UserTableV1', {
  ...usStackProps(),
});

const cloudfront3 = new CloudFrontStackV3(main, 'CloudFrontStackV3', {
  ...usStackProps(),
  creds: creds,
  user: userTableV1.user,
});

new CognitoGoogleStackV3(main, 'CognitoGoogleStackV3',{
  ...usStackProps(),
  callbackUrls: [
    // port defined in /client/.env 
    "http://localhost:9090",
    `https://${(cloudfront3.newDistro.distributionDomainName)}`,
  ],
  domainPrefix: "cog-poc-google3", // unique?
});


// to be deleted 


// WIP stacks
//const creds = new CredentialSsmStack(main, `CredentialSsmStack`, {
//  ...usEast1StackProps(),
//});



