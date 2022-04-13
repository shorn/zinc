#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { CognitoGoogleStackV3 } from "Stack/CognitoGoogleStackV3";
import { auStackProps } from "Util/Shared";
import { OneTableStackV1 } from "Stack/OneTableStackV1";
import { ClientBucketStackV1 } from "Stack/ClientBucketStack";
import { CloudFrontStackV4 } from "Stack/CloudFrontStackV4";
import { LambdaApiStackV1 } from "Stack/LambdaApiStackV1";
import { CredentialSsmStackV3 } from "Stack/CredentialSsmStackV3";
import {
  ClientBucketDeploymentStackV1
} from "Stack/ClientBucketDeploymentStack";

const main = new App();

// AU stacks

const auOneTableV1 = new OneTableStackV1(main, 'AuOneTableV1', {
  ...auStackProps(),
});

const auClientBucket = new ClientBucketStackV1(main, `ClientBucketStackV1`, {
  ...auStackProps()
});

const auCreds = new CredentialSsmStackV3(main, `AuCredentialSsmStack`, {
  ...auStackProps(),
});

const auLambdaApi = new LambdaApiStackV1(main, `LambdaApiStackV1`, {
  ...auStackProps(),
  creds: auCreds,
  table: auOneTableV1.table,
});

const auCloudFront = new CloudFrontStackV4(main, `CloudFrontStackV4`, {
  ...auStackProps(),
  api: auLambdaApi.api,
  s3Site: auClientBucket.s3Site,
})

const auClientDeployment = new ClientBucketDeploymentStackV1(
  main, 'ClientBucketDeploymentStackV1', {
    ...auStackProps(),
    distribution: auCloudFront.distribution,
    s3Site: auClientBucket.s3Site,
  }
);

const auGoogleCognito = new CognitoGoogleStackV3(
  main, 'AuCognitoGoogleStackV3',
  {
    ...auStackProps(),
    callbackUrls: [
      // port defined in /client/.env 
      "http://localhost:9090",
      `https://${(auCloudFront.distribution.distributionDomainName)}`,
    ],
    domainPrefix: "cog-poc-google-au", // unique?
  }
);


// to be deleted 





