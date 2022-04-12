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
      // I really have no idea what I'm doing with the pk/sk/gs1 stuff.
      pk: {type: String, value: 'user#${userId}'},
      sk: {type: String, value: 'user#${email}'},
      userId: {type: String, required: true},
      email: {type: String, required: true},
      gs1pk:      { type: String, value: 'user#' },
      gs1sk:      { type: String, value: 'user#${email}#${userId}' },    
    }
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
    return await this.user.get({userId: id});
  }

  async addUser(user: User): Promise<User>{
    /* If duplicate userId (hashKey), gives:
     | Conditional create failed for "User"
     | OneTableError: Conditional create failed for "User"
     Not very diagnosable, bad sign. :/     
     */
    return await this.user.create(user);
  }

  async listAllUsers(): Promise<User[]>{
    const result: User[] = [];

    let userPage: Paged<User> = await this.user.scan({});
    let next: any = null
    do {

      result.push(...userPage);

      userPage = await this.user.scan({}, {next})
      next = userPage.next
    } while( userPage.next );

    return result;
  }

  async findByEmailByListAll(email:string): Promise<User[]>{
    const all = await this.listAllUsers();
    return all.filter(it=>it.email === email);
  }
  
  async findByEmail(email:string): Promise<User[]>{
    let userPage: Paged<User> = await this.user.find({
        email
      },
      {
        index: 'gs1',
        follow: true,
      }
    )

    /* not good, doesn't iterate pages
     but I don't expect to see many dupe mails, should be ok for the moment
    */

    const result: User[] = [];
    result.push(...userPage);
    return result;
  }
  
}

