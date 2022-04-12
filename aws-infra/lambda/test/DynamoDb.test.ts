import { UserTableV1Db } from "../../lambda/src/Db/UserTableV1Db";
//import { UserTableV1Db } from "Db/UserTableV1Db";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { v4 } from "uuid";

const {fromIni} = require("@aws-sdk/credential-provider-ini");


describe("DynamoDb dev harness", () => {
  
  const db = new DynamoDB({
    region: "us-east-1", 
    credentials: fromIni({profile: 'cognito-poc'}),
  });
  const userTable = new UserTableV1Db(db, "inittest");
  
  test("findUser", async () => {

    const userId = "dev-harness-"+v4();
    
    const putResult = await userTable.addUser({
      userId, email: "1@example.com"
    });


    const getResult = await userTable.getUser(userId);
    console.log("getResult", getResult);

    const allUsers = await userTable.listAllUsers();
    console.log("allUsers", allUsers);
  });

  test("init", async () => {
    /* this creates the DynamoDb table - useless
     will give "Table already exists: usersV1" because we already created
     it in CDK. 
     Also tried it on a new tablename, it does create first exec, second time
     throws the "already exists" error.
    */
     await userTable.table.createTable();
     
     /* 
      Validation Error in "User" for "pk, sk, userId, email"
      OneTableError: Validation Error in "User" for "pk, sk, userId, email"
      */
    //await userTable.table.create("User", {});
  });  
});

