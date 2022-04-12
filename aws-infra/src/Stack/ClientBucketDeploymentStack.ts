import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, CfnBucket, IBucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";

export class ClientBucketDeploymentStackV1 extends Stack {
  constructor(
    scope: Construct,
    id: string,
    {s3Site, distribution, ...props}: StackProps & {
      s3Site: Bucket,
      distribution: Distribution,
    },
  ){
    super(scope, id, props);

    new BucketDeployment(this, id + `client-s3bucketdeployment`, {
      sources: [Source.asset("../client/build")],
      destinationBucket: s3Site,
      distribution: distribution,
      distributionPaths: ["/*"]
    });
  }
}

export function enableCorsOnBucket(bucket: IBucket){
  const cfnBucket = bucket.node.findChild("Resource") as CfnBucket;
  cfnBucket.addPropertyOverride("CorsConfiguration", {
    CorsRules: [
      {
        AllowedOrigins: ["*"],
        AllowedMethods: ["HEAD", "GET", "PUT", "POST", "DELETE"],
        ExposedHeaders: [
          "x-amz-server-side-encryption",
          "x-amz-request-id",
          "x-amz-id-2"
        ],
        AllowedHeaders: ["*"]
      }
    ]
  });
}
  
