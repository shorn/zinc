import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  ParameterTier,
  StringListParameter,
  StringParameter
} from "aws-cdk-lib/aws-ssm";
import { ssmStringListParam, ssmStringParam } from "Util/Ssm";

export class ZincGoogleCredentialSsmStackV1 extends Stack {
  GoogleOauthClientConfig: StringParameter;
  
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);

    // this are from the Github developer settings, OAuth app  
    this.GoogleOauthClientConfig = ssmStringParam(this, 'GoogleOauthClientConfig');
    
  }
  
}
