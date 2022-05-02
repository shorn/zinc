import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
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
import { cognitoDomain } from "Util/CognitoConstant";

export class CognitoGoogleStackV3 extends Stack {

  userPool: UserPool;
  client: UserPoolClient;
  domainPrefix: string;
  debug: boolean;

  constructor(
    scope: Construct,
    id: string,
    {callbackUrls, domainPrefix, debug = true, ...props}: StackProps & {
      callbackUrls: string[],
      /* I think this has to be unique? */
      domainPrefix: string,
      debug?: boolean,
    },
  ){
    super(scope, id, props);
    this.domainPrefix = domainPrefix;
    this.debug = debug;

    this.userPool = new UserPool(this, `${id}UserPool`, {
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
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix
      }
    });
    this.print(`Copy to Google dev console
      "Authorized JS origin": ${this.getAuthBaseUri()}
      "Authorized redirect URIs": ${this.getAuthBaseUri()}/oauth2/idpresponse
      "Authorized domains": ${cognitoDomain} `);


    //const clientIdParam = new StringParameter(this, 'GoogleClientId', {
    //  stringValue: 'set me via the console',
    //  // advanced costs money
    //  tier: ParameterTier.STANDARD,
    //});

    // will fail at diff time:
    // Error: Cannot retrieve value from context provider ssm since account/region are not specified at the stack level. Configure "env" with an account and region when you def
    // ine your stack.
    // const clientIdVfp = StringParameter.valueFromLookup(this, clientIdParam.parameterName);

    //  Error('Unable to determine ARN separator for SSM parameter since the parameter name is an unresolved token. Use "fromAttributes" and specify "simpleName" explicitly');
    //const clientIdFspa = StringParameter.fromStringParameterAttributes(this, 'MyValue', {
    //  parameterName: clientIdParam.parameterName,
    //  // 'version' can be specified but is optional.
    //}).stringValue;

    // will fail at diff time:
    // Unable to determine ARN separator for SSM parameter since the parameter name is an unresolved token. Use "fromAttributes" and specify "simpleName" explicitly'
    // const clientIdVfsp = StringParameter.valueForStringParameter(
    //   this, clientIdParam.parameterName, 2);  

    // will fail at deploy time:
    //  Error [ValidationError]: Template format error: Every Default member must be a string.   Error [ValidationError]: Template format error: Every Default member must be a string.
    // const clientIdFspa: IStringParameter = StringParameter.fromStringParameterAttributes(
    //   this, "clientIdFspa", {simpleName: true, parameterName: clientIdParam.node.id });

    this.print("Copy credentials from Google dev console to " +
      " / Cognito user pool" + " / Sign-in experience" +
      " / Federated identity provider sign-in / Google");
    // I believe name has to be "Google"; not sure why.
    const idProvider = new UserPoolIdentityProviderGoogle(this, "Google", {
      userPool: this.userPool,

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
      clientId: 'DO NOT SET IN CODE',
      clientSecret: 'DO NOT SET IN CODE',

      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
        custom: {
          email_verified: ProviderAttribute.other("email_verified"),
        },
      },
      scopes: ["profile", "email", "openid"],
    });

    this.print(id + " callbackUrls: ", callbackUrls);
    this.client = new UserPoolClient(this, "CognitoGoogleUserPoolClient", {
      userPool: this.userPool,
      disableOAuth: false,
      oAuth: {
        /* IMPROVE: get rid of implicit - considered insecure. 
        when it was just "code", I was getting "unauthorized client" from 
        the cognito /login url. */
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
          clientCredentials: false,
        },
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
        callbackUrls,
      },

      /* not needed if we squish id_token down to 5 min and
       do app authz tokens */
      enableTokenRevocation: true,

      generateSecret: false,

      preventUserExistenceErrors: true,

      idTokenValidity: Duration.minutes(60),
      accessTokenValidity: Duration.minutes(60),
      // IMPROVE: we don't use this, should be set short 
      refreshTokenValidity: Duration.minutes(60),

      supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE]
    });

    /* To hopefully avoid error: 
    "The provider Google does not exist for User Pool ap-southeast-xxx."
    Though I just ran `deploy` again and it worked. 
    https://github.com/aws/aws-cdk/issues/15692#issuecomment-884495678
    */
    this.client.node.addDependency(idProvider);
    
    // after deployment, populate these values in /client/src/Config.ts
    new CfnOutput(this, id + "CognitoGoogleUserPoolRegion", {
      value: this.region
    });
    new CfnOutput(this, id + "CognitoGoogleUserPoolId", {
      value: this.userPool.userPoolId
    });
    new CfnOutput(this, id + "CognitoGoogleUserPoolClientId", {
      value: this.client.userPoolClientId
    });
    new CfnOutput(this, id + "CognitoGoogleUserPoolDomain", {
      value: domainPrefix
    });

  }

  /* set in google developer console credentials "Authz JS origins" */
  getAuthBaseUri(){
    return `https://${this.domainPrefix}` +
      `.auth.${this.region}.${cognitoDomain}`
  }

  /* set in google developer console credentials "Authz redirect URIs" */
  getAuthRedirectUri(){
    return this.getAuthBaseUri() + "/oauth2/idpresponse";
  }

  print(message?: any, ...optionalParams: any[]){
    if( !this.debug ){
      return;
    }
    console.log(message, optionalParams);
  }
}


