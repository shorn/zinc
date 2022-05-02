#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { CognitoGoogleStackV3 } from "Stack/CognitoGoogleStackV3";
import { auStackProps } from "Util/SharedProps";
import { OneTableStackV1 } from "Stack/OneTableStackV1";
import { ClientBucketStackV1 } from "Stack/ClientBucketStack";
import { CredentialSsmStackV3 } from "Stack/CredentialSsmStackV3";
import {
  ClientBucketDeploymentStackV1
} from "Stack/ClientBucketDeploymentStack";
import { CognitoEmailStack } from "Stack/CognitoEmailStack";
import { LambdaZincApiStackV2 } from "Stack/LambdaZincApiStackV2";
import { CloudFrontStackV5 } from "Stack/CloudFrontStackV5";
import { CognitoGithubStackV1 } from "Stack/CognitoGithubStackV1";
import { LambdaGithubOidcApiStackV1 } from "Stack/LambdaGithubOidcApiStackV1";

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

// IMPROVE: rename to Zinc, but that will force recreation
const auLambdaZincApi = new LambdaZincApiStackV2(main, `LambdaApiStackV2`, {
  ...auStackProps(),
  creds: auCreds,
  table: auOneTableV1.table,
});

const auCloudFront5 = new CloudFrontStackV5(main, `CloudFrontStackV5`, {
  ...auStackProps(),
  functionUrl: auLambdaZincApi.functionUrl,
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
    // TODO:STO rename to "zinc-google-au"
    domainPrefix: "cog-poc-google-au", // unique?
  }
);

const auEmailCognito = new CognitoEmailStack(
  main, 'AuCognitoEmailStackV1', {
    ...auStackProps(),
    // TODO:STO rename to "zinc-email-au"
    domainPrefix: "cog-poc-email-au", // unique?
  }
);

const auGithubOidcLambda = new LambdaGithubOidcApiStackV1(
  main, 'LambdaGithubOidcApiStackV1', {
  }
);

const auGithubCognito = new CognitoGithubStackV1(
  main, 'AuCognitoGithubStackV1', {
    callbackUrls: [
      "http://localhost:9090",
      //"https://d3q1l9etnq2dqk.cloudfront.net",
      //`https://${(auCloudFront5.distribution.distributionDomainName)}`,
    ],
    oidcApiUrl: auGithubOidcLambda.githubOidcUrl.url,
    domainPrefix: "zinc-github-au",
  }
);


// to be deleted 





