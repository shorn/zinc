import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { helloWorld } from "Util/SharedData";
import {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2WithRequestContext,
  APIGatewayProxyHandlerV2,
  Context
} from "aws-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda/trigger/api-gateway-proxy";

const TABLE_NAME = process.env.TABLE_NAME || '';

// const db = new DynamoDBClient({});

console.log("AuthAuthV5 init");

export const handler: APIGatewayProxyHandlerV2 = async (
  event, context
): Promise<object> => {

  const params = {
    TableName: TABLE_NAME
  };

  try {
    // this worked through API gateway, but I think because we had a "lambda proxy"
    //return { statusCode: 200, body: JSON.stringify({message: "AuthUser3 " + helloWorld}) };

    // was getting error through Cloudfront
    // "The Lambda function result failed validation: The body is not a string, is not an object, or exceeds the maximum size."

    console.log("AuthAuthV5 exec", event, context);
    
    //return { statusCode: 200, body: {message: "AuthUserV3 " + helloWorld} };
    // trying this
    return { statusCode: 200, body: JSON.stringify({
        message: "AuthUserV5 2" + helloWorld,
        headers: event.headers,
        parthParams: event.pathParameters,
        queryParams: event.queryStringParameters,
        tableName: TABLE_NAME,
    }, null, 4) };

  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
