import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AccountRecovery, ClientAttributes,
  UserPool, UserPoolClient,
  UserPoolDomain,
  UserPoolEmail,
  VerificationEmailStyle
} from "aws-cdk-lib/aws-cognito";

export class CognitoEmailStack extends Stack {
  constructor(
    scope: Construct, 
    id: string,
    {domainPrefix, ...props}: StackProps & {
      /* Needs to be unique */
      domainPrefix: string,
    },
){
  super(scope, id, props);
    
    const userPool = new UserPool(this, "CognitoEmailUserPool", {
      /* Use the email address as the username, sort of.
      You use the user's email address in the "username" fields when calling
      signUp/signIn methods.
      Cognito will assign a random "username" (like a UUID), and that will 
      be what you see in the username field in the Cognito console and 
      currentUser/session fields. 
      */
      signInAliases: {
        email: true
      },

      selfSignUpEnabled: true,
      
      // emails are not case sensitive
      signInCaseSensitive: true,

      accountRecovery: AccountRecovery.EMAIL_ONLY,

      autoVerify: {
        email: true
      },

      userVerification: {
        emailStyle: VerificationEmailStyle.LINK,
        emailBody: "Welcome to the Cognito-POC!" +
          "<br/><br/>" +
          " {##Verify Email##} to confirm your Sign Up",
        emailSubject: "Verify your Cognito-poc signup",
      },
      
      
      userInvitation: {
        emailSubject: "admin cognito-poc invitation",
        emailBody: 'you are invited to cognito-poc' +
          ' as "{username}", password:"{####}"'
      },
      // limited per day I think, prod will need to use SES
      email: UserPoolEmail.withCognito(),
      
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireDigits: false,
        requireSymbols: false,
        requireUppercase: false,
        tempPasswordValidity: Duration.days(7),
      },
      
      standardAttributes: {
         email: {
           mutable: true,
           required: true,
         },
      }
    });

    new UserPoolDomain(this, "CognitoEmailUserPoolDomain", {
      userPool,
      cognitoDomain: {
        domainPrefix
      }
    });
    
    const client = new UserPoolClient(this, "CognitoEmailUserPoolClient", {
      userPool,
      disableOAuth: true,
      enableTokenRevocation: true,
      generateSecret: false,
      preventUserExistenceErrors: true,

      idTokenValidity: Duration.minutes(5),
      accessTokenValidity: Duration.minutes(5),
      refreshTokenValidity: Duration.minutes(60),

      authFlows:{
        userSrp: true,
      },
      
      readAttributes: new ClientAttributes().withStandardAttributes({
        email: true, emailVerified: true 
      }),
      
      writeAttributes: new ClientAttributes().withStandardAttributes({
        email: true,
      })
    });

    new CfnOutput(this, id+"CognitoEmailUserPoolId", {
      value: userPool.userPoolId
    });
    new CfnOutput(this, id+"CognitoEmailUserPoolClientId", {
      value: client.userPoolClientId
    });
    
  }
}

