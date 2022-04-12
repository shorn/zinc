import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  ParameterTier,
  StringListParameter,
  StringParameter
} from "aws-cdk-lib/aws-ssm";

export const initialParamValue = 'set me via the console';

/**
 * This should use SecureStrings but AWS intentionally don't support them, in 
 * a misguided attempt to force people to use Secrets Manager. 
 * So you end up with example code like this; or even better, all the CDK 
 * examples and doco where they just embed secrets in source code.
 */
export class CredentialSsmStackV3 extends Stack {
  // these aren't used yet, haven't been able to figure it out
  GoogleCredsClientId: StringParameter;
  GoogleCredsClientSecret: StringParameter;
  
  GoogleCognitoUserPoolRegion: StringParameter;
  GoogleCognitoUserPoolId: StringParameter;
  GoogleCognitoUserPoolClientId: StringParameter;
  GoogleCognitoUserPoolDomain: StringParameter;
  
  AuthzSecrets2: StringListParameter;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);

    // this are from the Google dev console, not the cognito user pool 
    this.GoogleCredsClientId = this.string('GoogleCredsClientId');
    this.GoogleCredsClientSecret = this.string('GoogleCredsClientSecret');
    
    // these are from the cognito user pool
    this.GoogleCognitoUserPoolRegion = 
      this.string('GoogleCognitoUserPoolRegion');
    this.GoogleCognitoUserPoolId = this.string('GoogleCognitoUserPoolId');
    this.GoogleCognitoUserPoolClientId = 
      this.string('GoogleCognitoUserPoolClientId');
    this.GoogleCognitoUserPoolDomain = 
      this.string('GoogleCognitoUserPoolDomain');
    
    // this is for creating the accessToken
    this.AuthzSecrets2 = this.stringList('AuthzSecrets2');
  }
  
  string(name:string): StringParameter{
    return new StringParameter(this, name, {
      //parameterName: name,
      stringValue: initialParamValue,
      // advanced costs money
      tier: ParameterTier.STANDARD,
    })  
  }
  stringList(name:string): StringListParameter{
    return new StringListParameter(this, name, {
      //parameterName: name,
      stringListValue: [initialParamValue],
      // advanced costs money
      tier: ParameterTier.STANDARD,
    })  
  }
}
