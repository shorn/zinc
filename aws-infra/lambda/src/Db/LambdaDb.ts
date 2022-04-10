import { User } from "shared/ApiTypes";

/* The worlds dodgiest "database".
The data is kept in memory in the lamba, relies on the lambda having 
reservedConcurrentExecutions = 1 so every call refers to the same instance.
The database gets "reset" as soon as AWS destroys the lambda (a few minutes).
Can keep the db alive for a while with "ping" messages to keep it in memory
("warm start" in AWAS Lambda parlance). 
Plan is to replace it with an DynamoDB at some point.
 */
const db = {
  users: [] as User[],
}

export async function addUser(email:string): Promise<User>{
  const user = {
    email: email,
    enabled: true,
  };
  db.users.push(user)

  return user;
}

export async function findUser(email: string): Promise<User|undefined>{
  return db.users.find(it => it.email === email);
}

export async function listUsers(){
  return db.users;
}