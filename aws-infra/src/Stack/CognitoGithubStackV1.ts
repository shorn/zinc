import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AccountRecovery,
  CfnUserPoolIdentityProvider,
  OAuthScope,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
  UserPoolEmail
} from "aws-cdk-lib/aws-cognito";

export class CognitoGithubStackV1 extends Stack {

  userPool: UserPool;
  client: UserPoolClient;
  domainPrefix: string;
  debug: boolean;

  constructor(
    scope: Construct,
    id: string,
    {callbackUrls, oidcApiUrl, domainPrefix, debug = true, ...props}: StackProps & {
      callbackUrls: string[],
      oidcApiUrl: string,
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

    new UserPoolDomain(this, "CognitoGithubUserPoolDomain", {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix
      }
    });

    // https://github.com/scenario-labs/cdk-user-pool-identity-provider-github/blob/main/src/user-pool-identity-provider-github.ts
    const idProvider = new CfnUserPoolIdentityProvider(
      this, 'GithubUserPoolIdentityProvider', {
        /* I think this needs to be unique, but not sure the exact scope 
         (global, account, account/region ?) */
        providerName: "zinc-github-oidc",
        providerDetails: {
          client_id: "DO NOT SET IN CODE",
          client_secret: "DO NOT SET IN CODE",
          attributes_request_method: 'GET',
          oidc_issuer: oidcApiUrl,
          authorize_scopes: 'openid read:user user:email',
          // functionUrl is canonical url (i.e. ends with a '/')
          authorize_url: `${oidcApiUrl}authorize`,
          token_url: `${oidcApiUrl}token`,
          attributes_url: `${oidcApiUrl}userinfo`,
          jwks_uri: `${oidcApiUrl}.well-known/jwks.json`,
        },
        providerType: 'OIDC',
        attributeMapping: {
          username: 'sub',
          email: 'email',
          email_verified: 'email_verified',
        },
        userPoolId: this.userPool.userPoolId,
      },
    );
    
    this.client = new UserPoolClient(this, "CognitoGithubUserPoolClient", {
      userPool: this.userPool,
      disableOAuth: false,
      oAuth: {
        /* IMPROVE: get rid of implicit, considered insecure */
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
          clientCredentials: false,
        },
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
        callbackUrls,
      },

      /* not needed because we use app-specific access tokens */
      enableTokenRevocation: true,

      generateSecret: false,

      preventUserExistenceErrors: true,

      idTokenValidity: Duration.minutes(60),
      accessTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.minutes(60),

      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.custom(idProvider.providerName)
      ]
    });

    /* UserPool.registerIdentityProvider() doesn't work with Cfn resources, only
    the known subclasses of IUserPoolIdentityProvider, and I can't find an 
    OIDC provider implementation. 
    So we use the string-based supportedIdentityProviders attribute instead,
    which means CDK doesn't know about the dependency. */
    this.client.node.addDependency(idProvider);

  }

  print(message?: any, ...optionalParams: any[]){
    if( !this.debug ){
      return;
    }
    console.log(message, optionalParams);
  }
}


