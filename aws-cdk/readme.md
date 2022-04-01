Initialised via `npx aws-cdk init --language typescript` on 2022-04-01.

To use this app in your own account, specify a different account-id and region
in the [stack environment](./bin/aws-cdk.ts).

The `package.json` specifies the `cognito-poc` profile in all its scripts, 
so setup your credentials like 
`~/.aws/credentials`:
```
[cognito-poc]
# account: 9999, user: aws-cdk-user
aws_access_key_id=AKIAxxx
aws_secret_access_key=xxx
```


