#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { SimpleTestStack } from "Stack/SimpleTestStack";
import { LambdaStack } from "Stack/LambdaStack";
import { CloudFrontStack } from "Stack/CloudFrontStack";
import { CognitoGoogleStack } from "Stack/CognitoGoogleStack";
import { CognitoEmailStack } from "Stack/CognitoEmailStack";

export const sourceCode = "github.com/shorn/cognito-poc/aws-infra";

const main = new App();

// new SimpleTestStack(main, 'SimpleStack', sharedStackProps());
new LambdaStack(main, 'LambdaStack', sharedStackProps());
new CloudFrontStack(main, 'CloudFrontStack', sharedStackProps());
new CognitoGoogleStack(main, 'CognitoGoogleStack', sharedStackProps());
new CognitoEmailStack(main, 'CognitoEmailStack', sharedStackProps());

function sharedStackProps(){
  return {
    tags: {
      ManagedBy: sourceCode,
    },
  }
}
