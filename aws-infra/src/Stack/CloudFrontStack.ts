import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, CfnBucket, IBucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  CloudFrontAllowedCachedMethods,
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution, ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";

export class CloudFrontStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps){
    super(scope, id, props);
    
    const s3Site = new Bucket(this, `ClientBucket`, {
      publicReadAccess: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    this.enableCorsOnBucket(s3Site);

    const cfDistro = new CloudFrontWebDistribution(
      this, `cf-distribution`,
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: s3Site
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                compress: true,
                allowedMethods: CloudFrontAllowedMethods.ALL,
                cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
                forwardedValues: {
                  queryString: true,
                  cookies: {
                    forward: "none"
                  },
                  headers: [
                    "Access-Control-Request-Headers",
                    "Access-Control-Request-Method",
                    "Origin"
                  ]
                }
              }
            ]
          }
        ],
        comment: `CloudFront Distribution by aws-infra stack`,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      }
    );
    
    // Setup Bucket Deployment to automatically deploy new assets and invalidate cache
    new BucketDeployment(this, `client-s3bucketdeployment`, {
      sources: [Source.asset("../client/build")],
      destinationBucket: s3Site,
      distribution: cfDistro,
      distributionPaths: ["/*"]
    });

    new CfnOutput(this, "CloudFront URL", {
      value: cfDistro.distributionDomainName
    });
  }

  enableCorsOnBucket = (bucket: IBucket) => {
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
  };  
}