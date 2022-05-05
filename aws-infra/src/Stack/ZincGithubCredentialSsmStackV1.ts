import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  ParameterTier,
  StringListParameter,
  StringParameter
} from "aws-cdk-lib/aws-ssm";
import { ssmStringListParam, ssmStringParam } from "Util/Ssm";

export class ZincGithubCredentialSsmStackV1 extends Stack {
  // in cognito, these where configured in the idp
  GithubClientId: StringParameter;
  GithubClientSecret: StringParameter;
  
  // in cognito, this went in the UserPool App Client 
  GithubAllowedCallbackUrls: StringListParameter;

  /* In cognito, this was the UserPool Domain.
  Need to have an SSM param to break the cycle between the ZincApi lambda and 
  the ZincGithubAuth lambda. 
  */
  ZincGithubAuthnFunctionUrl: StringParameter;
  
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);

    // this are from the Github developer settings, OAuth app  
    this.GithubClientId = ssmStringParam(this, 'GithubClientId');
    this.GithubClientSecret = ssmStringParam(this, 'GithubClientSecret');
    this.GithubAllowedCallbackUrls = 
      ssmStringListParam(this, 'GithubAllowedCallbackUrls');
    this.ZincGithubAuthnFunctionUrl = 
      ssmStringParam(this, 'ZincGithubAuthnFunctionUrl');
    
  }
  
}
