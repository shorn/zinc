import { StackProps } from "aws-cdk-lib";

const sourceCodeUrl = "github.com/shorn/cognito-poc/aws-infra";

export function agnosticStackProps(){
  return {
    tags: {
      ManagedBy: sourceCodeUrl,
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
      ManagedBy: sourceCodeUrl,
    },
  }
}

/*
Originally because cloudfront demanded functions be in us-east-1, then CDK 
demanded that all cross-stack references be in the same region.
Actually, not using cloudfront functions any more, can probably go back to au.
 */
export function usStackProps(): StackProps{
  return {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "us-east-1",
    },
    tags: {
      ManagedBy: sourceCodeUrl,
    },
  }
}

export function auStackProps(): StackProps{
  return {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "ap-southeast-2",
    },
    tags: {
      ManagedBy: sourceCodeUrl,
    },
  }
}

