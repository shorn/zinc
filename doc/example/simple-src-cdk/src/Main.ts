#!/usr/bin/env node
import 'source-map-support/register';
import {
  App,
  aws_s3 as s3,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { sourceCode } from "Util/Shared";

const app = new App();


export class SimpleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps){
    super(scope, id, {
      tags: {
        ManagedBy: sourceCode,
        ...props?.tags
      },
      ...props
    });

    // The code that defines your stack goes here

    new s3.Bucket(this, 'SimpleCdkBucketTestV1', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
  }
}

new SimpleStack(app, 'SimpleStack', {
});

