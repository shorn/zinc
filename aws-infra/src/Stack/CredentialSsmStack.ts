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
 * a fundamentally misguided attempt to force people to use Secrets Manager. 
 */
export class CredentialSsmStack extends Stack {
  GoogleCredsClientId: StringParameter;
  GoogleCredsClientSecret: StringParameter;
  GoogleCognitoUserPoolRegion: StringParameter;
  GoogleCognitoUserPoolId: StringParameter;
  GoogleCognitoUserPoolClientId: StringParameter;
  AuthzSecrets: StringListParameter;

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
    
    // this is for creating the accessToken
    this.AuthzSecrets = this.stringList('AuthzSecrets');
  }
  
  string(name:string): StringParameter{
    return new StringParameter(this, name, {
      parameterName: name,
      stringValue: initialParamValue,
      // advanced costs money
      tier: ParameterTier.STANDARD,
    })  
  }
  stringList(name:string): StringListParameter{
    return new StringListParameter(this, name, {
      parameterName: name,
      stringListValue: [initialParamValue],
      // advanced costs money
      tier: ParameterTier.STANDARD,
    })  
  }
}
