import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";

export class CredentialSsmStack extends Stack {
  googleClientIdParam: StringParameter;
  
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {
    },
  ){
    super(scope, id, props);

    this.googleClientIdParam = new StringParameter(this, 'GoogleClientId', {
      stringValue: 'set me via the console',
      // advanced costs money
      tier: ParameterTier.STANDARD,
    });


  }
}
