import { CfnOutput, Duration, Fn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  OriginProtocolPolicy,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  OriginSslPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { FunctionUrl } from "aws-cdk-lib/aws-lambda";

export const prdApiPath = "api-prd-v2";

export class CloudFrontStackV5 extends Stack {
  distribution: Distribution;

  constructor(
    scope: Construct,
    id: string,
    {functionUrl, s3Site, ...props}: StackProps & {
      functionUrl: FunctionUrl,
      s3Site: Bucket,
    },
  ){
    super(scope, id, props);

    const apiCachePolicy = new CachePolicy(this, id + "ApiCachePolicy", {
      queryStringBehavior: CacheQueryStringBehavior.all(),
      cookieBehavior: CacheCookieBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList("Authorization"),
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      //set to 0, this gives "invalid request" 
      maxTtl: Duration.seconds(1)
    });

    /* Custom policy because can't use ALL_VIEWER. ALL_VIEWER would forward 
    the "host" header of cloudfront, which will cause API-GW to not work because 
    it uses the host header (where it expects to see the API-GW host name) to 
    dispatch requests to API handlers. Presumably, function urls
    work off of the host header too. */
    const originRequestPolicy = new OriginRequestPolicy(
      this, id +"OriginRequestPolicy", 
      {
        cookieBehavior: CacheCookieBehavior.all(),
        /* You can't put "authorization" in here, because that would enable the 
        possibility of having auth here but not in the cache policy.
        That would be bad because it would enable cache poisoning and similar 
        attacks. But it's not needed anyway because headers defined in the cache 
        policy automatically get passed through to the origin. */
        headerBehavior: OriginRequestHeaderBehavior.none(),
        queryStringBehavior: OriginRequestQueryStringBehavior.all()
    });

    this.distribution = new Distribution(this, id + "Distro", {
      comment: id + "Distro",
      defaultBehavior: {
        origin: new S3Origin(s3Site),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        [`${prdApiPath}/*`]: {
          compress: true,
          originRequestPolicy: originRequestPolicy,
          // https://stackoverflow.com/a/72010828/924597
          origin: new HttpOrigin(Fn.select(2, Fn.split('/', functionUrl.url)), {
            protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
            originSslProtocols: [OriginSslPolicy.TLS_V1_2],
          }),
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          // error when create stack new from scratch with CACHING_DISABLED:
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