import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  NodejsFunction,
  NodejsFunctionProps
} from "aws-cdk-lib/aws-lambda-nodejs";
import {
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { join } from "path";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { CredentialSsmStackV3 } from "Stack/CredentialSsmStackV3";

export const initialParamValue = 'set me via the console';

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src`;

/**
 * This should use SecureStrings but AWS intentionally don't support them, in 
 * a misguided attempt to force people to use Secrets Manager. 
 * So you end up with example code like this; or even better, all the CDK 
 * examples and doco where they just embed secrets in source code.
 */
export class LambdaApiStackV1 extends Stack {
  api: RestApi;
  lambdaFunction: NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    {creds, table, ...props}: StackProps & {
      creds: CredentialSsmStackV3,
      table: Table,
    },
  ){
    super(scope, id, props);

    this.api = new RestApi(this, id + 'PublicApi', {
      restApiName: id + ' public API',
      deployOptions: {
        stageName: "api-prd",
        cachingEnabled: false,
        loggingLevel: MethodLoggingLevel.INFO,
      },
    });

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


    this.lambdaFunction = new NodejsFunction(this, 'LambdaApiV2', {
      entry: join(__dirname, lambdaSrcDir, 'LambdaApiV2.ts'),
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
        AUTHZ_SECRETS_SSM_PARAM: creds.AuthzSecrets2.parameterName,
      }
    });
    this.api.root.addResource('lambda-v2').addMethod('POST',
      new LambdaIntegration(this.lambdaFunction), {});

    /* blech: either make a list construct or something, or smoosh it all the
    config into one param stored as a blob of JSON. */
    creds.CognitoUserPoolRegion.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolRegion.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolId.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolDomain.grantRead(this.lambdaFunction);
    creds.GoogleCognitoUserPoolClientId.grantRead(this.lambdaFunction);
    creds.EmailCognitoUserPoolId.grantRead(this.lambdaFunction);
    creds.EmailCognitoUserPoolClientId.grantRead(this.lambdaFunction);
    creds.AuthzSecrets2.grantRead(this.lambdaFunction);

    table.grantReadWriteData(this.lambdaFunction);
    
  }
  
}
