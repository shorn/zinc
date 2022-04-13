
## Structure

![architecture](../doc/aws-infra.svg)
Diagram by [Cloudcraft](https://www.cloudcraft.co/).

The  AWS CDK entry point is [src/Main.ts](src/Main.ts), this
instantiates the components shown in the diagram from the stack classes
under [src/Stack](src/Stack)

## Paths

I like absolute paths for my imports, got the implementation from: 
https://github.com/moltar/cdk-ts-path-mapping
