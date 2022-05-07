import {
  GetParameterCommand,
  GetParameterCommandOutput,
  SSMClient
} from "@aws-sdk/client-ssm";
import { forceError } from "Util/Error";

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

// IMPROVE: needs better types
export type JsonObject = object;
export async function readJsonParam<T extends JsonObject>(
  name: string | undefined,
  expectedFields: string[] = [],
): Promise<T>{

  if( !name ){
    throw new Error("no SSM param name provided");
  }

  const command = new GetParameterCommand({Name: name});
  const response: GetParameterCommandOutput = await client.send(command);

  const paramValue = response.Parameter?.Value;
  if( !paramValue ){
    throw new Error(`no value for SSM param ${name}`);
  }

  let jsonValue: any;
  try {
    jsonValue = JSON.parse(paramValue);
  }
  catch( err ){
    console.error("problem parsing json config SSM value", forceError(err).message, paramValue);
    throw new Error(`could not parse config value for ${name}` )
  }
  
  validateJsonFields({
    jsonValue, 
    fields: expectedFields, 
    msgPrefix: "value of SSM config param " + name });
  return jsonValue as T;
}

function validateJsonFields({jsonValue, fields, msgPrefix}: {
  msgPrefix?: string,
  jsonValue: any,
  fields: string[],
}){
  fields.forEach(it => {
    if( !jsonValue[it] ){
      throw new Error(
        `${msgPrefix || "json object"} did not contain value for [${it}]` );
    }
  });
}
