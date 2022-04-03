#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { SimpleTestStack } from "Stack/SimpleTestStack";
import { LambdaStack } from "Stack/LambdaStack";
import { CloudFrontStack } from "Stack/CloudFrontStack";

export const sourceCode = "github.com/shorn/cognito-poc/aws-infra";

const main = new App();

new SimpleTestStack(main, 'SimpleStack', sharedStackProps());
new LambdaStack(main, 'LambdaStack', sharedStackProps());
new CloudFrontStack(main, 'CloudFrontStack', sharedStackProps());

function sharedStackProps(){
  return {
    tags: {
      ManagedBy: sourceCode,
    },
  }
}
