import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { enableCorsOnBucket } from "Stack/ClientBucketDeploymentStack";

export class ClientBucketStackV1 extends Stack {
  s3Site: Bucket;

  constructor(
    scope: Construct,
    id: string,
    {...props}: StackProps & {},
  ){
    super(scope, id, props);

    this.s3Site = new Bucket(this, id + `ClientBucket`, {
      publicReadAccess: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    enableCorsOnBucket(this.s3Site);
  }
}