import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { helloWorld } from "Util/SharedData";

const TABLE_NAME = process.env.TABLE_NAME || '';

// const db = new DynamoDBClient({});
const name = "AuthAuthDirectV1";

console.log(name + " init");

export const handler = async (): Promise<any> => {

  const params = {
    TableName: TABLE_NAME
  };

  try {
    // this worked through API gateway, but I think because we had a "lambda proxy"
    //return { statusCode: 200, body: JSON.stringify({message: "AuthUser3 " + helloWorld}) };

    // was getting error through Cloudfront
    // "The Lambda function result failed validation: The body is not a string, is not an object, or exceeds the maximum size."

    console.log(name + " exec");
    
    //return { statusCode: 200, body: {message: "AuthUserV3 " + helloWorld} };
    // trying this
    return { statusCode: 200, body: JSON.stringify({message: name + " 2" + helloWorld}) };

  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
