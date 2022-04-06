import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime, Version } from "aws-cdk-lib/aws-lambda";
import {
  IResource,
  MockIntegration,
  PassthroughBehavior
} from "aws-cdk-lib/aws-apigateway";
import {
  NodejsFunction,
  NodejsFunctionProps
} from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";

const lambdaBaseDir = "../../lambda";
const lambdaSrcDir = `${lambdaBaseDir}/src`;

export class LambdaStackV3 extends Stack {
  authUserVersion5: Version;
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


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

    const authUserV5 = new NodejsFunction(this, id+'AuthUserV5', {
      entry: join(__dirname, lambdaSrcDir, 'AuthUserV5.ts'),
      ...nodeJsFunctionProps,
    });

    this.authUserVersion5 = new Version(this, 'AuthUserVersion5', { lambda: authUserV5, });
    // arn:aws:lambda:us-east-1:669305508162:function:LambdaStackV3-LambdaStackV3AuthUserV4E4121FCD-quVSKiz0hAwt:1
    
    //const addUser = new NodejsFunction(this, 'AddUser', {
    //  entry: join(__dirname, lambdaSrcDir, 'AddUser.ts'),
    //  ...nodeJsFunctionProps,
    //});

    //// Create an API Gateway resource for each of the CRUD operations
    //const api = new RestApi(this, 'CognitoPocPublicApi', {
    //  restApiName: 'Cognito POC public API'
    //});
    //
    //// the resource controls the url
    //const authUserResource = api.root.addResource('auth-user');
    //authUserResource.addMethod('GET', new LambdaIntegration(this.authUser));
    //addCorsOptions(authUserResource);
    //
    //const addUserResource = api.root.addResource('add-user');
    //addUserResource.addMethod('POST', new LambdaIntegration(addUser));
    //addCorsOptions(addUserResource);

  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}

