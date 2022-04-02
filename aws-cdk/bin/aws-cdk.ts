#!/usr/bin/env node
import 'source-map-support/register';
import { AwsCdkStack } from '../lib/aws-cdk-stack';
import { App, Tag } from "aws-cdk-lib";
import { LambdaStack } from "../lib/LambdaStack";

export const sourceCode = "github.com/shorn/cognito-poc/aws-cdk";

const app = new App();

new AwsCdkStack(app, 'AwsCdkStack', {
});
new LambdaStack(app, 'LambdaStack', {
});
