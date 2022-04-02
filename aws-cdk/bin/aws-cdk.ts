#!/usr/bin/env node
import 'source-map-support/register';
import { AwsCdkStack } from '../lib/aws-cdk-stack';
import { App, Tag } from "aws-cdk-lib";

export const sourceCode = "github.com/shorn/cognito-poc/aws-cdk";

const app = new App();

const awsSdkStack = new AwsCdkStack(app, 'AwsCdkStack', {
});
