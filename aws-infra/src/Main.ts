#!/usr/bin/env node
import 'source-map-support/register';
import { App, } from "aws-cdk-lib";
import { SimpleTestStack } from "Stack/SimpleTestStack";
import { LambdaStack } from "Stack/LambdaStack";

export const sourceCode = "github.com/shorn/cognito-poc/aws-infra";

const main = new App();

new SimpleTestStack(main, 'SimpleStack', {});
new LambdaStack(main, 'LambdaStack', {});

