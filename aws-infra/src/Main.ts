#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { CognitoGoogleStackV3 } from "Stack/CognitoGoogleStackV3";
import { auStackProps } from "Util/Shared";
import { OneTableStackV1 } from "Stack/OneTableStackV1";
import { ClientBucketStackV1 } from "Stack/ClientBucketStack";
import { CredentialSsmStackV3 } from "Stack/CredentialSsmStackV3";
import {
  ClientBucketDeploymentStackV1
} from "Stack/ClientBucketDeploymentStack";
import { CognitoEmailStack } from "Stack/CognitoEmailStack";
import { LambdaApiStackV2 } from "Stack/LambdaApiStackV2";
import { CloudFrontStackV5 } from "Stack/CloudFrontStackV5";

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

const auLambdaApi2 = new LambdaApiStackV2(main, `LambdaApiStackV2`, {
  ...auStackProps(),
  creds: auCreds,
  table: auOneTableV1.table,
});

const auCloudFront5 = new CloudFrontStackV5(main, `CloudFrontStackV5`, {
  ...auStackProps(),
  functionUrl: auLambdaApi2.functionUrl,
  s3Site: auClientBucket.s3Site,
})


const auClientDeployment = new ClientBucketDeploymentStackV1(
  main, 'ClientBucketDeploymentStackV1', {
    ...auStackProps(),
    distribution: auCloudFront5.distribution,
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
      `https://${(auCloudFront5.distribution.distributionDomainName)}`,
    ],
    domainPrefix: "cog-poc-google-au", // unique?
  }
);

const auEmailCognito = new CognitoEmailStack(
  main, 'AuCognitoEmailStackV1', {
    ...auStackProps(),
    domainPrefix: "cog-poc-email-au", // unique?
  }
);


// to be deleted 





