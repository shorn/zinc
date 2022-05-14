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

const lambdaBaseDir = "../../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src/AuthnApi`;

export class CognitoGithubOidcApiLambdaStack extends Stack {
  githubOidcFn: NodejsFunction;
  githubOidcUrl: FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    {...props}: StackProps & {
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

    this.githubOidcFn = new NodejsFunction(this, 'CognitoGithubOidcApi', {
      entry: join(__dirname, lambdaSrcDir, 'CognitoGithubOidcApiHandler.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
      }
    });

    /* doesn't need CORS, flow only involves redirecting the browser or 
    backend API calls from Cognito - browser SOP does not apply. */
    this.githubOidcUrl = new FunctionUrl(this, 'CognitoGithubOidcApiUrl', {
      function: this.githubOidcFn,
      authType: FunctionUrlAuthType.NONE,
    });

  }
  
}
