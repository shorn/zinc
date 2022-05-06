import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  NodejsFunction,
  NodejsFunctionProps
} from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import {
  FunctionUrl,
  FunctionUrlAuthType, HttpMethod,
  Runtime
} from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { CredentialSsmStackV3 } from "Stack/CredentialSsmStackV3";
import {
  ZincGithubCredentialSsmStackV1
} from "Stack/ZincGithubCredentialSsmStackV1";
import {
  ZincGoogleCredentialSsmStackV1
} from "Stack/ZincGoogleCredentialSsmStackV1";

export const initialParamValue = 'set me via the console';

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src/ZincGoogleAuthn`;

export class LambdaZincGoogleAuthnStackV1 extends Stack {
  lambdaFunction: NodejsFunction;
  functionUrl: FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    {creds, ...props}: StackProps & {
      creds: ZincGoogleCredentialSsmStackV1,
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

    this.lambdaFunction = new NodejsFunction(this, 'LambdaZincGoogleAuthnV1', {
      entry: join(__dirname, lambdaSrcDir, 'ZincGoogleAuthnHandlerV1.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
        GOOGLE_CLIENT_OAUTH_CONFIG_SSM_PARAM:
          creds.GoogleOauthClientConfig.parameterName,
      }
    });

    /* doesn't need CORS, flow only involves redirecting the browser so the 
    SOP does not apply. */
    this.functionUrl = new FunctionUrl(this, 'ZincGithubAuthnApiUrl', {
      function: this.lambdaFunction,
      authType: FunctionUrlAuthType.NONE,
    });

    creds.GoogleOauthClientConfig.grantRead(this.lambdaFunction);
    
  }
  
}
