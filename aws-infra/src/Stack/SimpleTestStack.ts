import { aws_s3 as s3, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

export class SimpleTestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps){
    super(scope, id, props);

    // The code that defines your stack goes here

    new s3.Bucket(this, 'SimpleCdkBucketTestV1', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
  }
}

