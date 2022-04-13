import { DynamoDB } from "@aws-sdk/client-dynamodb";

import Dynamo from 'dynamodb-onetable/Dynamo'
import { Model, Paged, Table } from 'dynamodb-onetable'
import { PublicUserData, User } from "shared";

export interface ServerUser {
  userId: string,
  email: string,
  displayName?: string,
  message?: string,
  created: Date,
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
      // I really have no idea what I'm doing with the pk/sk/gs stuff.
      pk: {type: String, value: 'user#${userId}'},
      sk: {type: String, value: 'user#${email}'},
      userId: {type: String, required: true},
      email: {type: String, required: true},
      created: {type: Date, required: false},
      onlyAfter: {type: Date, required: false},
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
  user: Model<ServerUser>;
  table: Table;

  constructor(private db: DynamoDB, public tableName: string){
    this.oneDb = new Dynamo({client: db});

    this.table = new Table({
      client: this.oneDb,
      name: tableName,
      schema: UserSchema,
    });

    this.user = this.table.getModel('User');
  }

  async getUser(id: string): Promise<ServerUser | undefined>{
    return await this.user.get({userId: id});
  }

  async addUser(user: Omit<ServerUser, "created">): Promise<ServerUser>{
    /* If duplicate userId (hashKey), gives:
     | Conditional create failed for "User"
     | OneTableError: Conditional create failed for "User"
     Not very diagnosable, bad sign. :/ */
    let serverUser = await this.user.create(user);
    return serverUser;
  }

  /**
   * list ALL uses in the table, this is not a good design, especially 
   * for DDB.
   * Need to figure out how pagination across our API with DDB.  
   */
  async listAllUsers(): Promise<PublicUserData[]>{
    const result: PublicUserData[] = [];

    let userPage: Paged<ServerUser> = await this.user.scan({});
    let next: any = null
    do {

      userPage.forEach(it=> {
        result.push({
          userId: it.userId, 
          displayName: it.displayName,
          userCreated: it.created,
        }); 
      });

      userPage = await this.user.scan({}, {next})
      next = userPage.next
    } while( userPage.next );

    return result;
  }

  async findByEmail(email:string): Promise<ServerUser[]>{
    let userPage: Paged<ServerUser> = await this.user.find({
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

    const result: ServerUser[] = [];
    result.push(...userPage);
    return result;
  }
  
}

