import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AccountRecovery,
  OAuthScope,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
  UserPoolEmail,
  UserPoolIdentityProviderGoogle
} from "aws-cdk-lib/aws-cognito";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";

export class CognitoGoogleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps){
    super(scope, id, props);

    const clientIdParam = new StringParameter(this, 'GoogleClientId', {
      stringValue: 'set me via the console',
      // advanced costs money
      tier: ParameterTier.STANDARD,
    });

    const userPool = new UserPool(this, "CognitoGoogleUserPool", {
      signInAliases: {
        email: true
      },
      accountRecovery: AccountRecovery.NONE,
      selfSignUpEnabled: true,
      autoVerify: {},

      // emails are not case sensitive
      signInCaseSensitive: true,

      // limited per day I think, prod will need to use SES
      email: UserPoolEmail.withCognito(),
    });

    new UserPoolDomain(this, "CognitoGoogleUserPoolDomain", {
      userPool,
      cognitoDomain: {
        /* this value along with region, needs to be set in google developer
        console credentials:
        Authz JS origins: 
          https://cog-poc-google.auth.ap-southeast-2.amazoncognito.com
        Authz redirect URIs: 
          https://cog-poc-google.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse
        Contrast with the the value in google developer console 
        "OAuth consent screen / Authorized domains" which is a static value of
        `amazoncognito.com`. */
        domainPrefix: "cog-poc-google"
      }
    });

    // will fail at diff time:
    // Error: Cannot retrieve value from context provider ssm since account/region are not specified at the stack level. Configure "env" with an account and region when you def
    // ine your stack.
    // const clientIdVfp = StringParameter.valueFromLookup(this, clientIdParam.parameterName);

    // will fail at diff time:
    // Unable to determine ARN separator for SSM parameter since the parameter name is an unresolved token. Use "fromAttributes" and specify "simpleNam e" explicitly'
    // const clientIdVfsp = StringParameter.valueForStringParameter(
    //   this, clientIdParam.parameterName, 2);  

    // will fail at deploy time:
    //  Error [ValidationError]: Template format error: Every Default member must be a string.   Error [ValidationError]: Template format error: Every Default member must be a string.
    // const clientIdFspa: IStringParameter = StringParameter.fromStringParameterAttributes(
    //   this, "clientIdFspa", {simpleName: true, parameterName: clientIdParam.node.id });

    // name might have to be "Google"; not sure, haven't tested yet
    const idp = new UserPoolIdentityProviderGoogle(this, "Google", {
      userPool,

      /* If you set these values here, you will compromise your Google 
      dev credentials. Once they detect that, Google may or may not shut down 
      your entire Google account at their discretion.
      Instead, after you've deployed the stack, use the Console to set these
      values manually.
      CDK `diff` and CloudFormation drift detection will not detect your 
      manual changes.  
      But note that Google logins will fail and you will have to 
      reset the creds after any time you deploy a change to this resource,
      because the credetentials will get reset to these values.  
      */
      clientId: "DO NOT SET IN CODE",
      clientSecret: 'DO NOT SET IN CODE',

      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
        custom: {
          email_verified: ProviderAttribute.other("email_verified"),
        },
      },
      scopes: ["profile", "email", "openid"],
    });

    new UserPoolClient(this, "CognitoGoogleUserPoolClient", {
      userPool,
      disableOAuth: false,
      oAuth: {
        /* when it was just "code", I was getting "unauthorized client" from 
         the cognito /login url.  Needs research - implicit is considered 
         insecure by security wonks. */
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
          clientCredentials: false,
        },
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
        callbackUrls: [
          "http://localhost:9090",
          /* need to import this from the CloudFront stack. */
          "https://d18cqbvz409npy.cloudfront.net"
        ],
      },

      /* not needed if we squish id_token down to 5 min and
       do app authz tokens */
      enableTokenRevocation: true,

      generateSecret: false,

      preventUserExistenceErrors: true,

      idTokenValidity: Duration.minutes(5),
      accessTokenValidity: Duration.minutes(5),
      refreshTokenValidity: Duration.minutes(60),

      supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE]
    });
  }
}

