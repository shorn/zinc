import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table
} from "aws-cdk-lib/aws-dynamodb";


export const tableName = "oneTableV1";
export const pkName = "pk";
export const skName = "sk";
export const gsIndexName = "gs1";

export class OneTableStackV1 extends Stack {
  table: Table;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {},
  ){
    super(scope, id, props);

    this.table = new Table(this, id+tableName, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      tableName: tableName,
      partitionKey: {
        name: pkName,
        type: AttributeType.STRING
      },
      sortKey: {
        name: skName,
        type: AttributeType.STRING
      },
      // NOT recommended for production code
      removalPolicy: RemovalPolicy.DESTROY,
    });
    
    this.table.addGlobalSecondaryIndex({
      indexName: gsIndexName,
      partitionKey: {name: gsIndexName+pkName, type: AttributeType.STRING},
      sortKey: {name: gsIndexName+skName, type: AttributeType.STRING},
      projectionType: ProjectionType.INCLUDE,
      nonKeyAttributes: [gsIndexName+pkName, gsIndexName+skName] 
    })

  }
  
}
