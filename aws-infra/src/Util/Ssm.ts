import {
  ParameterTier,
  StringListParameter,
  StringParameter
} from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export const initialParamValue = 'set me via the console';

export function ssmStringParam(scope: Construct, name:string): StringParameter{
  return new StringParameter(scope, name, {
    //parameterName: name,
    stringValue: initialParamValue,
    // advanced costs money
    tier: ParameterTier.STANDARD,
  })
}
export function ssmStringListParam(
  scope: Construct, name:string
): StringListParameter{
  return new StringListParameter(scope, name, {
    //parameterName: name,
    stringListValue: [initialParamValue],
    // advanced costs money
    tier: ParameterTier.STANDARD,
  })
}
