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
  HttpMethod,
  Runtime
} from "aws-cdk-lib/aws-lambda";

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src`;

/**
 * This should use SecureStrings but AWS intentionally don't support them, in 
 * a misguided attempt to force people to use Secrets Manager. 
 * So you end up with example code like this; or even better, all the CDK 
 * examples and doco where they just embed secrets in source code.
 */
export class LambdaGithubOidcApiStackV1 extends Stack {
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

    this.githubOidcFn = new NodejsFunction(this, 'LambdaGithubOidcApiV1', {
      entry: join(__dirname, lambdaSrcDir, 'LambdaGithubOidcApiV1.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
      }
    });

    this.githubOidcUrl = new FunctionUrl(this, 'LambdaGithubOidcApiUrl', {
      function: this.githubOidcFn,
      authType: FunctionUrlAuthType.NONE,
      cors: {
        // IMPROVE: WIP, fix it when I know WTF is going on
        allowedOrigins: ["*"],
        allowCredentials: true,
        allowedMethods: [HttpMethod.ALL],
        maxAge: Duration.seconds(10),
      }
    });

  }
  
}
