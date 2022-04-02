import { aws_s3 as s3, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { sourceCode } from "../bin/aws-cdk";

export class AwsCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps){
    super(scope, id, {
      tags: {
        ManagedBy: sourceCode,
        ...props?.tags
      },
      ...props
    });

    // The code that defines your stack goes here

    new s3.Bucket(this, 'StoCdkBucketTestV8', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    new s3.Bucket(this, 'StoCdkBucketTestV7', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
  }
}
