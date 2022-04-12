import { DynamoDB } from "@aws-sdk/client-dynamodb";

import Dynamo from 'dynamodb-onetable/Dynamo'
import { Model, Paged, Table } from 'dynamodb-onetable'

export interface User {
  userId: string,
  email: string,
  displayName?: string,
  message?: string,
}

const UserSchema = {
  format: 'onetable:1.1.0',
  version: '0.0.1',
  indexes: {
    primary: {hash: 'pk', sort: 'sk'},
    gs1:     { hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk'] },
  },
  models: {
    User: {
      pk: {type: String, value: 'user#${userId}'},
      sk: {type: String, value: 'user#${email}'},
      userId: {type: String, required: true},
      email: {type: String, required: true},
      //  Search by user email or by type
      gs1pk:      { type: String, value: 'user#' },
      gs1sk:      { type: String, value: 'user#${email}#${userId}' },    }
  },
  params: {
    'isoDates': true,
    'timestamps': true,
  },
}

export class UserTableV1Db {
  oneDb: Dynamo;
  user: Model<User>;
  table: Table;

  constructor(private db: DynamoDB, public tableName: string){
    //this.db = new DynamoDB({region, credentials: {}});
    this.oneDb = new Dynamo({client: db});

    this.table = new Table({
      client: this.oneDb,
      name: tableName,
      schema: UserSchema,
    });

    this.user = this.table.getModel('User');
  }

  async getUser(id: string): Promise<User | undefined>{
    //const params = {
    //  TableName: this.tableName,
    //  Key: {
    //    [userKeyName]: {S: id},
    //  },
    //  //ProjectionExpression: "ATTRIBUTE_NAME",
    //};
    //
    //const data: GetItemCommandOutput = await this.db.send(
    //  new GetItemCommand(params));
    //console.log("Success", data);

    return await this.user.get({userId: id});
  }

  async addUser(user: User): Promise<void>{
    /* If duplicate userId (hashKey), gives:
     | Conditional create failed for "User"
     | OneTableError: Conditional create failed for "User"
     Not very diagnosable, bad sign. :/     
     */
    const result = await this.user.create(user);
    console.log("put result", result);
    return;
  }

  async listAllUsers(): Promise<User[]>{
    const result: User[] = [];

    let userPage: Paged<User> = await this.user.find({});
    let next: any = null
    do {

      result.concat(userPage);

      userPage = await this.user.find({}, {next, limit: 100})
      next = userPage.next
    } while( userPage.next );

    return result;
  }
}

