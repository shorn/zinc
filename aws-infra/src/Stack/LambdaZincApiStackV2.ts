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
import { CredentialSsmStackV3 } from "Stack/CredentialSsmStackV3";
import {
  ZincGithubCredentialSsmStackV1
} from "Stack/ZincGithubCredentialSsmStackV1";

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src`;

/**
 * This should use SecureStrings but AWS intentionally don't support them, in 
 * a misguided attempt to force people to use Secrets Manager. 
 * So you end up with example code like this; or even better, all the CDK 
 * examples and doco where they just embed secrets in source code.
 */
export class LambdaZincApiStackV2 extends Stack {
  lambdaFunction: NodejsFunction;
  functionUrl: FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    {creds, table, githubCreds, ...props}: StackProps & {
      creds: CredentialSsmStackV3,
      githubCreds: ZincGithubCredentialSsmStackV1,
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

    // TODO:STO rename to Zinc
    this.lambdaFunction = new NodejsFunction(this, 'LambdaApiV2', {
      entry: join(__dirname, lambdaSrcDir, 'LambdaZincApiV2.ts'),
      ...nodeJsFunctionProps,
      reservedConcurrentExecutions: 5,
      environment: {
        COGNITO_REGION_SSM_PARAM:
          creds.CognitoUserPoolRegion.parameterName,
        COGNITO_GOOGLE_USER_POOL_ID_SSM_PARAM:
          creds.GoogleCognitoUserPoolId.parameterName,
        COGNITO_GOOGLE_USER_POOL_DOMAIN_SSM_PARAM:
          creds.GoogleCognitoUserPoolDomain.parameterName,
        COGNITO_GOOGLE_USER_POOL_CLIENT_ID_SSM_PARAM:
          creds.GoogleCognitoUserPoolClientId.parameterName,
        COGNITO_EMAIL_USER_POOL_ID_SSM_PARAM:
          creds.EmailCognitoUserPoolId.parameterName,
        COGNITO_EMAIL_USER_POOL_CLIENT_ID_SSM_PARAM:
          creds.EmailCognitoUserPoolClientId.parameterName,
        COGNITO_GITHUB_USER_POOL_DOMAIN_SSM_PARAM:
          creds.GithubCognitoUserPoolDomain.parameterName,
        COGNITO_GITHUB_USER_POOL_ID_SSM_PARAM:
          creds.GithubCognitoUserPoolId.parameterName,
        COGNITO_GITHUB_USER_POOL_CLIENT_ID_SSM_PARAM:
          creds.GithubCognitoUserPoolClientId.parameterName,
        ZINC_GITHUB_CLIENT_ID_SSM_PARAM:
          githubCreds.GithubClientId.parameterName,
        ZINC_GITHUB_CLIENT_SECRET_SSM_PARAM:
          githubCreds.GithubClientSecret.parameterName,
        ZINC_GITHUB_AUTHN_FUNCTION_URL_SSM_PARAM:
          githubCreds.ZincGithubAuthnFunctionUrl.parameterName,
        AUTHZ_SECRETS_SSM_PARAM: creds.AuthzSecrets2.parameterName,
      }
    });

    // TODO:STO rename to Zinc
    this.functionUrl = new FunctionUrl(this, 'LambdaApiUrl', {
      function: this.lambdaFunction,
      authType: FunctionUrlAuthType.NONE,
    });


    /* blech: either make a list construct or something, or smoosh it all the
    config into one param stored as a blob of JSON. */
    creds.CognitoUserPoolRegion.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolRegion.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolId.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolDomain.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolClientId.grantRead(this.lambdaFunction);
    creds.EmailCognitoUserPoolId.grantRead(this.lambdaFunction);
    creds.EmailCognitoUserPoolClientId.grantRead(this.lambdaFunction);
    creds.GithubCognitoUserPoolDomain.grantRead(this.lambdaFunction);
    creds.GithubCognitoUserPoolId.grantRead(this.lambdaFunction);
    creds.GithubCognitoUserPoolClientId.grantRead(this.lambdaFunction);
    /* IMPROVE: want to remove this, but have to re-create stack to do it? 
    If I try to remove this last reference, then CDK `deploy` will fail:
    "ExportsOutputRefGithubCognitoXXX cannot be deleted as it is in use 
    by LambdaApiStackV2" */
    creds.GithubCognitoUserPoolClientSecret.grantRead(this.lambdaFunction);
    githubCreds.GithubClientId.grantRead(this.lambdaFunction);
    githubCreds.GithubClientSecret.grantRead(this.lambdaFunction);
    githubCreds.ZincGithubAuthnFunctionUrl.grantRead(this.lambdaFunction);
    creds.AuthzSecrets2.grantRead(this.lambdaFunction);

    table.grantReadWriteData(this.lambdaFunction);
    
  }
  
}
