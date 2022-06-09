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
import {
  DirectAafAuthnApiConfigParamStack
} from "Stack/Lambda/DirectAafAuthnApiConfigParamStack";

const lambdaBaseDir = "../../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src/AuthnApi`;

export class DirectAafAuthnApiLambdaStack extends Stack {
  lambdaFunction: NodejsFunction;
  functionUrl: FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    {config, ...props}: StackProps & {
      config: DirectAafAuthnApiConfigParamStack,
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

    this.lambdaFunction = new NodejsFunction(this, 'DirectAafAuthnApi', {
      entry: join(__dirname, lambdaSrcDir, 'DirectAafAuthnApiHandler.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
        DIRECT_AAF_AUTHN_CONFIG_SSM_PARAM:
          config.DirectAafAuthnApiConfig.parameterName,
      }
    });

    /* doesn't need CORS, flow only involves redirecting the browser so the 
    SOP does not apply. */
    this.functionUrl = new FunctionUrl(this, 'DirectAafAuthnApiUrl', {
      function: this.lambdaFunction,
      authType: FunctionUrlAuthType.NONE,
    });

    config.DirectAafAuthnApiConfig.grantRead(this.lambdaFunction);
    
  }
  
}
