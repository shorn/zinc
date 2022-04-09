import { StackProps } from "aws-cdk-lib";

export function agnosticStackProps(){
  return {
    tags: {
      ManagedBy: "github.com/shorn/cognito-poc/aws-infra",
    },
  }
}

export function boundStackProps(): StackProps{
  return {
    /* Note, using CDK node vars like this is special: 
     https://docs.aws.amazon.com/cdk/v2/guide/environments.html */
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    tags: {
      ManagedBy: "github.com/shorn/cognito-poc/aws-infra",
    },
  }
}

/*
Because cloudfront demands functions be in us-east-1, then CDK demands that
all cross-stack references be in the same region.
 */
export function usEast1StackProps(): StackProps{
  return {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "us-east-1",
    },
    tags: {
      ManagedBy: "github.com/shorn/cognito-poc/aws-infra",
    },
  }
}

