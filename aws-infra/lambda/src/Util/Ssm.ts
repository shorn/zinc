import {
  GetParameterCommand,
  GetParameterCommandOutput,
  SSMClient
} from "@aws-sdk/client-ssm";

/* executes at lambda init-time, don't do too much here.
Might be better to turn it into a class the lambda instantiates at init-time.
*/
const client = new SSMClient({});

export async function readStringParam(name: string | undefined)
: Promise<string>{

  if( !name ){
    throw new Error("no SSM param name provided");
  }

  const command = new GetParameterCommand({Name: name});
  const response: GetParameterCommandOutput = await client.send(command);

  const paramValue = response.Parameter?.Value;
  if( !paramValue ){
    throw new Error(`no value for SSM param ${name}`);
  }

  return paramValue;
}


export async function readStringListParam(name: string | undefined)
: Promise<string[]>{
  const command = new GetParameterCommand({Name: name});
  const response: GetParameterCommandOutput = await client.send(command);

  const paramValue = response.Parameter?.Value;
  if( !paramValue ){
    throw new Error(`no value for SSM param ${name}`);
  }

  const values = paramValue.split(",");

  if( !values || values.length < 1 ){
    throw new Error(`no values in ${name}`);
  }

  return values;
}
