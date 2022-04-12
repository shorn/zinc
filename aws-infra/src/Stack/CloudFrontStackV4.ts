import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

export interface ThisProps extends StackProps {

}

export class CloudFrontStackV4 extends Stack {
  distribution: Distribution;

  constructor(
    scope: Construct,
    id: string,
    {api, s3Site, ...props}: StackProps & {
      api: RestApi,
      s3Site: Bucket,
    },
  ){
    super(scope, id, props);

    const apiPrdUrl = `${api.restApiId}.execute-api`+
      `.${this.region}.${this.urlSuffix}`;

    const apiCachePolicy = new CachePolicy(this, id + "ApiCachePolicy", {
      queryStringBehavior: CacheQueryStringBehavior.all(),
      cookieBehavior: CacheCookieBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList(
        "Authorization",
        "CogPocAuth"
      ),
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      //set to 0, this gives "invalid request" 
      maxTtl: Duration.seconds(1)
    });

    this.distribution = new Distribution(this, id + "Distro", {
      comment: id + "Distro",
      defaultBehavior: {
        origin: new S3Origin(s3Site),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        [`${api.deploymentStage.stageName}/*`]: {
          compress: true,
          // this is what causes the weird "Cannot contact system" error?
          //originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
          origin: new HttpOrigin(apiPrdUrl, {}),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          // error when create stack new from scratch wotj CACHING_DISABLED:
          // Invalid request provided: MinTTL, MaxTTL and DefaultTTL should follow order MinTTL less than or equal to DefaultTTL less than or equal to MaxTTL 
          //cachePolicy: CachePolicy.CACHING_DISABLED,
          cachePolicy: apiCachePolicy,
        },
      },
    });

    new CfnOutput(this, id + "DistributionDomainOut", {
      exportName: id + "DistributionDomainOut",
      value: this.distribution.distributionDomainName
    });
  }
}