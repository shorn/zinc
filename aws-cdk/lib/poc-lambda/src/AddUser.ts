import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { helloWorld } from "Util/SharedData";

const TABLE_NAME = process.env.TABLE_NAME || '';

// const db = new DynamoDBClient({});

export const handler = async (): Promise<any> => {

  const params = {
    TableName: TABLE_NAME
  };

  try {
    // const response = await db.scan(params).promise();
    return { statusCode: 200, body: JSON.stringify({message: "AddUser3 " + helloWorld}) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
