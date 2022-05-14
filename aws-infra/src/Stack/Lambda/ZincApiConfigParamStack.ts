import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { ssmStringParam } from "Util/Ssm";

export class ZincApiConfigParamStack extends Stack {
  ZincApiConfig: StringParameter;
  
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);
    
    // for expected value, see ZincApiConfig.ts
    this.ZincApiConfig = ssmStringParam(this, 'ZincApiConfig');
  }
  
}
