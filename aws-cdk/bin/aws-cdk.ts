#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCdkStack } from '../lib/aws-cdk-stack';


const app = new cdk.App();

new AwsCdkStack(app, 'AwsCdkStack', {
});