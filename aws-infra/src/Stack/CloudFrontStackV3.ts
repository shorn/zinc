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
  OriginRequestPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {
  NodejsFunction,
  NodejsFunctionProps
} from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { addCorsOptions } from "Stack/LambdaStack";
import {
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

export interface ThisProps extends StackProps {
  
}

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src`;

export class CloudFrontStackV3 extends Stack {
  //cfDistro: CloudFrontWebDistribution;
  newDistro: Distribution;
  
  constructor(
    scope: Construct, 
    id: string, 
    props: StackProps & {
      //lambda: LambdaStack,
    }, 
  ){
    super(scope, id, props);
    const s3Site = new Bucket(this, id+`ClientBucket`, {
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
      environment: {
      },
      runtime: Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: Duration.seconds(5),
    }

    const authUser = new NodejsFunction(this, 'AuthUser', {
      entry: join(__dirname, lambdaSrcDir, 'AuthUserV5.ts'),
      ...nodeJsFunctionProps,
    });

    const authUserDirect = new NodejsFunction(this, 'AuthUserDirect', {
      entry: join(__dirname, lambdaSrcDir, 'AuthUserDirectV1.ts'),
      ...nodeJsFunctionProps,
    });

    const apiPrd = new RestApi(this, id+'PublicApi', {
      restApiName: id+' public API',
      deployOptions: {
        stageName: "api-prd",
        cachingEnabled: false,
        loggingLevel: MethodLoggingLevel.INFO, 
      },
    });

    // the resource controls the url
    const authUserResource = apiPrd.root.addResource('auth-user');
    authUserResource.addMethod('GET', new LambdaIntegration(authUser), {
       
    });
    // don't need CORS if calling via cloudfront?
    addCorsOptions(authUserResource);

    const apiPrdUrl = `${apiPrd.restApiId}.execute-api.${this.region}.${this.urlSuffix}`;
    
    const apiCachePolicy = new CachePolicy(this, id+"ApiCachePolicy", {
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
    
    this.newDistro = new Distribution(this, id+"NewDistro",{
      comment: id+"NewCfDistro",
      //defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3Origin(s3Site),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,        
      },
      additionalBehaviors: {
        [`${apiPrd.deploymentStage.stageName}/*`]: {
          compress: true,
          // this is what causes the weird "Cannot contact system" error?
          //originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
          origin: new HttpOrigin(apiPrdUrl, {
            //customHeaders: {
            //}
          }),
          //origin: new HttpOrigin(apiPrdUrl),
          allowedMethods: AllowedMethods.ALLOW_ALL, 
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          // error when create stack new from scratch wotj CACHING_DISABLED:
          // Invalid request provided: MinTTL, MaxTTL and DefaultTTL should follow order MinTTL less than or equal to DefaultTTL less than or equal to MaxTTL 
          //cachePolicy: CachePolicy.CACHING_DISABLED,
          cachePolicy: apiCachePolicy,
          
        },
        //'/auth-user-direct':{
        //  origin: new S3Origin(s3Site),
        //  allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        //  viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
        //  cachePolicy: CachePolicy.CACHING_DISABLED,
        //  functionAssociations: [
        //    {
        //      function: authUserDirect.currentVersion,
        //      eventType: FunctionEventType.VIEWER_REQUEST,
        //    }
        //  ]
        //},
      },      
    });
    
    //this.cfDistro = new CloudFrontWebDistribution(
    //  this, id + `CloudFrontDistro`, {
    //    originConfigs: [
    //      { // this serves the client app files from s3 bucket 
    //        s3OriginSource: {
    //          s3BucketSource: s3Site
    //        },
    //        behaviors: [
    //          {
    //            isDefaultBehavior: true,
    //            compress: true,
    //            allowedMethods: CloudFrontAllowedMethods.ALL,
    //            cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
    //            forwardedValues: {
    //              queryString: true,
    //              cookies: {
    //                forward: "none"
    //              },
    //              headers: [
    //                "Access-Control-Request-Headers",
    //                "Access-Control-Request-Method",
    //                "Origin"
    //              ]
    //            },
    //
    //          },
    //        ]
    //      }, // s3OriginSource
    //      {  // this serves the API from API-gateway
    //        customOriginSource: {
    //          domainName: `${apiPrd.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
    //          originPath: ""
    //        },
    //        behaviors: [
    //          {
    //            allowedMethods: CloudFrontAllowedMethods.ALL,
    //            pathPattern: `${apiPrd.deploymentStage.stageName}/*`,
    //            maxTtl: Duration.millis(0),
    //          },
    //        ],
    //      }, // customOriginSource - api-prd          
    //    ], // originConfigs
    //    comment: id + ` by aws-infra stack`,
    //    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    //  }
    //);
    
    // Setup Bucket Deployment to automatically deploy new assets and invalidate cache
    new BucketDeployment(this, id+`client-s3bucketdeployment`, {
      sources: [Source.asset("../client/build")],
      destinationBucket: s3Site,
      distribution: this.newDistro,
      distributionPaths: ["/*"]
    });

    new CfnOutput(this, id+"DistributionDomainOut", {
      exportName: id+"DistributionDomainOut",
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