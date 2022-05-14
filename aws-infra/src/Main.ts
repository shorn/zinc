#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { CognitoGoogleStackV3 } from "Stack/CognitoGoogleStackV3";
import { auStackProps } from "Util/SharedProps";
import { OneTableStackV1 } from "Stack/OneTableStackV1";
import { ClientBucketStackV1 } from "Stack/ClientBucketStack";
import {
  ClientBucketDeploymentStackV1
} from "Stack/ClientBucketDeploymentStack";
import { CognitoEmailStack } from "Stack/CognitoEmailStack";
import { CloudFrontStackV5 } from "Stack/CloudFrontStackV5";
import { CognitoGithubStackV1 } from "Stack/CognitoGithubStackV1";
import { ZincApiConfigParamStack } from "Stack/Lambda/ZincApiConfigParamStack";
import {
  DirectGoogleAuthnApiConfigParamStack
} from "Stack/Lambda/DirectGoogleAuthnApiConfigParamStack";
import {
  DirectGithubAuthnApiConfigParamStack
} from "Stack/Lambda/DirectGithubAuthnApiConfigParamStack";
import { ZincApiLambdaStack } from "Stack/Lambda/ZincApiLambdaStack";
import {
  DirectGoogleAuthnApiLambdaStack
} from "Stack/Lambda/DirectGoogleAuthnApiLambdaStack";
import {
  DirectGithubAuthnApiLambdaStack
} from "Stack/Lambda/DirectGithubAuthnApiLambdaStack";
import {
  CognitoGithubOidcApiLambdaStack
} from "Stack/Lambda/CognitoGithubOidcApiLambdaStack";

const main = new App();

// AU stacks

const auOneTableV1 = new OneTableStackV1(main, 'AuOneTableV1', {
  ...auStackProps(),
});

const auClientBucket = new ClientBucketStackV1(main, `ClientBucketStackV1`, {
  ...auStackProps()
});

const auZincApiConfig = new ZincApiConfigParamStack(
  main, `ZincApiConfigParamStack`, {
    ...auStackProps(),
  }
);

const auDirectGoogleAuthnConfig = new DirectGoogleAuthnApiConfigParamStack(
  main, `DirectGoogleAuthnApiConfigParamStack`, {
    ...auStackProps(),
  }
);

const auDirectGithubAuthnConfig = new DirectGithubAuthnApiConfigParamStack(
  main, `DirectGithubAuthnApiConfigParamStack`, {
    ...auStackProps(),
  }
);

const auZincApiLambda = new ZincApiLambdaStack(
  main, 'ZincApiLambdaStack', {
    ...auStackProps(),
    zincApiConfig: auZincApiConfig,
    directGoogleConfig: auDirectGoogleAuthnConfig,
    directGithubConfig: auDirectGithubAuthnConfig,
    table: auOneTableV1.table,
  }
);

const auDirectGoogleAuthnLambda = new DirectGoogleAuthnApiLambdaStack(
  main, 'DirectGoogleAuthnApiLambdaStack', {
    ...auStackProps(),
    config: auDirectGoogleAuthnConfig,
  }
);

const auDirectGithubAuthnLambda = new DirectGithubAuthnApiLambdaStack(
  main, 'DirectGithubAuthnApiLambdaStack', {
    ...auStackProps(),
    config: auDirectGithubAuthnConfig,
  }
);

const auCloudFront5 = new CloudFrontStackV5(main, `CloudFrontStackV5`, {
  ...auStackProps(),
  functionUrl: auZincApiLambda.functionUrl,
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
    domainPrefix: "zinc-google-au", // unique?
  }
);

const auEmailCognito = new CognitoEmailStack(
  main, 'AuCognitoEmailStackV1', {
    ...auStackProps(),
    domainPrefix: "zinc-email-au", // unique?
  }
);

const auCognitoGithubOidcLambda = new CognitoGithubOidcApiLambdaStack(
  main, 'CognitoGithubOidcApiLambdaStack', {
    ...auStackProps(),
  }
);

const auGithubCognito = new CognitoGithubStackV1(
  main, 'AuCognitoGithubStackV1', {
    ...auStackProps(),
    callbackUrls: [
      "http://localhost:9090",
      `https://${(auCloudFront5.distribution.distributionDomainName)}`,
    ],
    oidcApiUrl: auCognitoGithubOidcLambda.githubOidcUrl.url,
    domainPrefix: "zinc-github-au",
  }
);






