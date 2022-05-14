import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StringListParameter, StringParameter } from "aws-cdk-lib/aws-ssm";
import { ssmStringListParam, ssmStringParam } from "Util/Ssm";

export class DirectGithubAuthnApiConfigParamStack extends Stack {
  DirectGithubAuthnApiConfig: StringParameter;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);

    // see DirectGithubAuthnApiHandler  
    this.DirectGithubAuthnApiConfig = ssmStringParam(
      this, 'DirectGithubAuthnApiConfig' );
  }

}
