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

export const initialParamValue = 'set me via the console';

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src/ZincGithubAuthn`;

export class LambdaZincGithubAuthnStackV2 extends Stack {
  lambdaFunction: NodejsFunction;
  functionUrl: FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    {creds, ...props}: StackProps & {
      creds: ZincGithubCredentialSsmStackV1,
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

    this.lambdaFunction = new NodejsFunction(this, 'LambdaZincGithubAuthnV1', {
      entry: join(__dirname, lambdaSrcDir, 'ZincGithubAuthnHandlerV1.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
        GITHUB_CLIENT_ID_SSM_PARAM:
          creds.GithubClientId.parameterName,
        GITHUB_CLIENT_SECRET_SSM_PARAM:
          creds.GithubClientSecret.parameterName,
        GITHUB_CALLBACK_URLS_SSM_PARAM:
          creds.GithubAllowedCallbackUrls.parameterName,
      }
    });

    /* doesn't need CORS, flow only involves redirecting the browser so the 
    SOP does not apply. */
    this.functionUrl = new FunctionUrl(this, 'ZincGithubAuthnApiUrl', {
      function: this.lambdaFunction,
      authType: FunctionUrlAuthType.NONE,
    });

    creds.GithubClientId.grantRead(this.lambdaFunction);
    creds.GithubClientSecret.grantRead(this.lambdaFunction);
    creds.GithubAllowedCallbackUrls.grantRead(this.lambdaFunction);
    
  }
  
}
