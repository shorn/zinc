import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";


export const userTableName = "usersV1";
export const userKeyName = "userId";

export class UserTableV1 extends Stack {
  user: Table;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);

    this.user = new Table(this, id+userTableName, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: userKeyName,
        type: AttributeType.STRING
      },
      tableName: userTableName,

      // NOT recommended for production code
      removalPolicy: RemovalPolicy.DESTROY,
    });

  }
  
}
