import { UserTableV1Db } from "../../lambda/src/Db/UserTableV1Db";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { v4 } from "uuid";
import { tableName as oneTableName } from "../../src/Stack/OneTableStackV1";

const {fromIni} = require("@aws-sdk/credential-provider-ini");

/** This isn't a unit test - it's  a dev harness.
 * It relies on too much environment binding ("cofnito-poc") and environment
 * setup.
 * It's not intended to be run as part of the automated test suite.
 * Will need to mock out or "localise" DDB, will need to create OneTable 
 * structure.
 */
describe("DynamoDb dev harness", () => {

  // you must manually match region for whereever you put your table in CDK
  const db = new DynamoDB({
    region: "ap-southeast-2",
    credentials: fromIni({profile: 'cognito-poc'}),
  });
  const userTable = new UserTableV1Db(db, oneTableName);
  const uniqueId = v4();
  const userId = "dev-harness-" + uniqueId;
  const email = uniqueId + "@example.com";

    test("read a created user", async ()=>{
      const putResult = await userTable.addUser({
        userId, email: email, enabled: true });
      console.log("putResult", putResult, putResult.created.getTime());
      expect(putResult.created.getTime()).toBeTruthy();
      expect(putResult.displayName).toBeFalsy();

      const getResult = await userTable.getServerUser(userId);
      expect(getResult).toBeTruthy();
      if( !getResult ) throw Error("no result found");

      expect(getResult.email).toEqual(email);
      expect(getResult.displayName).toBeFalsy();
      console.log("getResult", getResult);
      
    });

    test("read an updated user", async ()=>{
      const getResult = await userTable.getServerUser(userId);
      if( !getResult ) throw Error("no result found");
      getResult.displayName = "test display";
      const updateResult = await userTable.updateUser(getResult);
      expect(updateResult!.displayName).toEqual("test display");
      const getUpdatedResult = await userTable.getServerUser(userId);
      expect(getUpdatedResult!.displayName).toEqual("test display");
    });

    test("create user with same email", async ()=>{
      // different userId, same email
      await userTable.addUser({
        userId: userId + "a", email: email, enabled: true });
      const foundByEmail = await userTable.findByEmail(email);
      expect(foundByEmail).toHaveLength(2);
      // Dunno about ordering, but seems to pass reliably at the moment
      expect(foundByEmail[0].userId).toEqual(userId);
      expect(foundByEmail[1].userId).toEqual(userId + "a");
      console.log("foundByEmail", foundByEmail);

    });

    test("list users", async ()=>{
      const allUsers = await userTable.listAllUsers();
      const foundUser = allUsers.find(it => it.userId === userId);
      expect(foundUser).toBeTruthy();
      expect(foundUser!.userId).toEqual(userId);
      console.log("allUsers.length", allUsers.length);

    });

  /* this creates the AWS DynamoDb table. - use this when 
     The second time this is called, will give "Table already exists: usersV1"
     Instead of this, the table is created via the OneTableStack, so that
     permissions can be granted, etc. 
     Was useful when creating the CDK stack first time, just looked at
     what this did and reproduced with the CDK resources.
     That means the CDK resourc ei shard-coded to things like "pk", "sk", etc. 
     Oh well.
    */
  //test("init", async () => {
  //  await userTable.table.createTable();
  //});
});

