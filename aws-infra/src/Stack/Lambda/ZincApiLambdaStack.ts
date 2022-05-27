import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  NodejsFunction,
  NodejsFunctionProps
} from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import {
  FunctionUrl,
  FunctionUrlAuthType,
  Runtime
} from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import {
  DirectGithubAuthnApiConfigParamStack
} from "Stack/Lambda/DirectGithubAuthnApiConfigParamStack";
import {
  DirectGoogleAuthnApiConfigParamStack
} from "Stack/Lambda/DirectGoogleAuthnApiConfigParamStack";
import { ZincApiConfigParamStack } from "Stack/Lambda/ZincApiConfigParamStack";
import {
  DirectFacebookAuthnApiConfigParamStack
} from "Stack/Lambda/DirectFacebookAuthnApiConfigParamStack";
import {
  DirectTwitterAuthnApiConfigParamStack
} from "Stack/Lambda/DirectTwitterAuthnApiConfigParamStack";

const lambdaBaseDir = "../../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src/ZincApi`;

/**
 * This should use SecureStrings but AWS intentionally don't support them, in 
 * a misguided attempt to force people to use Secrets Manager. 
 * So you end up with example code like this; or even better, all the CDK 
 * examples and doco where they just embed secrets in source code.
 */
export class ZincApiLambdaStack extends Stack {
  lambdaFunction: NodejsFunction;
  functionUrl: FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    {
      zincApiConfig, 
      directGithubConfig, 
      directGoogleConfig,
      directFacebookConfig,
      directTwitterConfig,
      table, 
      ...props
    }: StackProps & {
      zincApiConfig: ZincApiConfigParamStack,
      directGithubConfig: DirectGithubAuthnApiConfigParamStack,
      directGoogleConfig: DirectGoogleAuthnApiConfigParamStack,
      directFacebookConfig: DirectFacebookAuthnApiConfigParamStack,
      directTwitterConfig: DirectTwitterAuthnApiConfigParamStack,
      table: Table,
    },
  ){
    super(scope, id, props);

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

    this.lambdaFunction = new NodejsFunction(this, 'ZincApi', {
      entry: join(__dirname, lambdaSrcDir, 'ZincApiHandler.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
        ZINC_API_CONFIG_SSM_PARAM:
          zincApiConfig.ZincApiConfig.parameterName,
        DIRECT_GOOGLE_OAUTH_CONFIG_SSM_PARAM:
          directGoogleConfig.DirectGoogleAuthnApiConfig.parameterName,
        DIRECT_GITHUB_OAUTH_CONFIG_SSM_PARAM:
          directGithubConfig.DirectGithubAuthnApiConfig.parameterName,
        DIRECT_FACEBOOK_OAUTH_CONFIG_SSM_PARAM:
          directFacebookConfig.DirectFacebookAuthnApiConfig.parameterName,
        DIRECT_TWITTER_OAUTH_CONFIG_SSM_PARAM:
          directTwitterConfig.DirectTwitterAuthnApiConfig.parameterName,
      }
    });

    this.functionUrl = new FunctionUrl(this, 'ZincApiUrl', {
      function: this.lambdaFunction,
      authType: FunctionUrlAuthType.NONE,
    });

    zincApiConfig.ZincApiConfig.grantRead(this.lambdaFunction);
    directGoogleConfig.DirectGoogleAuthnApiConfig.grantRead(this.lambdaFunction);
    directGithubConfig.DirectGithubAuthnApiConfig.grantRead(this.lambdaFunction);
    directFacebookConfig.DirectFacebookAuthnApiConfig.grantRead(this.lambdaFunction);
    directTwitterConfig.DirectTwitterAuthnApiConfig.grantRead(this.lambdaFunction);

    table.grantReadWriteData(this.lambdaFunction);
  }
  
}
