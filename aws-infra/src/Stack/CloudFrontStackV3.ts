import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, CfnBucket, IBucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {
  NodejsFunction,
  NodejsFunctionProps
} from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CredentialSsmStackV2 } from "Stack/CredentialSsmStackV2";

export interface ThisProps extends StackProps {

}

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src`;

export class CloudFrontStackV3 extends Stack {
  newDistro: Distribution;

  constructor(
    scope: Construct,
    id: string,
    {creds, ...props}: StackProps & {
      creds: CredentialSsmStackV2,
    },
  ){
    super(scope, id, props);
    const s3Site = new Bucket(this, id + `ClientBucket`, {
      publicReadAccess: true,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    this.enableCorsOnBucket(s3Site);

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, lambdaBaseDir, 'package-lock.json'),
      runtime: Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: Duration.seconds(5),
    }

    const apiPrd = new RestApi(this, id + 'PublicApi', {
      restApiName: id + ' public API',
      deployOptions: {
        stageName: "api-prd",
        cachingEnabled: false,
        loggingLevel: MethodLoggingLevel.INFO,
      },
    });


    let apiV2 = new NodejsFunction(this, 'LambdaApiV2', {
      entry: join(__dirname, lambdaSrcDir, 'LambdaApiV2.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 1,
      environment: {
        // circular dependency to cloudfront stack, dunno how to resolve
        COGNITO_REGION_SSM_PARAM:
          creds.GoogleCognitoUserPoolRegion.parameterName,
        COGNITO_GOOGLE_USER_POOL_ID_SSM_PARAM: 
          creds.GoogleCognitoUserPoolId.parameterName,
        COGNITO_GOOGLE_USER_POOL_DOMAIN_SSM_PARAM: 
          creds.GoogleCognitoUserPoolDomain.parameterName,
        COGNITO_GOOGLE_USER_POOL_CLIENT_ID_SSM_PARAM: 
          creds.GoogleCognitoUserPoolClientId.parameterName,
        AUTHZ_SECRETS_SSM_PARAM: creds.AuthzSecrets2.parameterName,
      }
    });
    apiPrd.root.addResource('lambda-v2').addMethod('POST',
      new LambdaIntegration(apiV2), {});

    creds.GoogleCognitoUserPoolRegion.grantRead(apiV2);
    creds.GoogleCognitoUserPoolId.grantRead(apiV2);
    creds.GoogleCognitoUserPoolDomain.grantRead(apiV2);
    creds.GoogleCognitoUserPoolClientId.grantRead(apiV2);
    creds.AuthzSecrets2.grantRead(apiV2);

    // don't need CORS if calling via cloudfront?
    //addCorsOptions(authUserResource);

    const apiPrdUrl = `${apiPrd.restApiId}.execute-api`+
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
      maxTtl: Duration.seconds(1)
    });

    this.newDistro = new Distribution(this, id + "NewDistro", {
      comment: id + "NewCfDistro",
      defaultBehavior: {
        origin: new S3Origin(s3Site),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        [`${apiPrd.deploymentStage.stageName}/*`]: {
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

    new BucketDeployment(this, id + `client-s3bucketdeployment`, {
      sources: [Source.asset("../client/build")],
      destinationBucket: s3Site,
      distribution: this.newDistro,
      distributionPaths: ["/*"]
    });

    new CfnOutput(this, id + "DistributionDomainOut", {
      exportName: id + "DistributionDomainOut",
      value: this.newDistro.distributionDomainName
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