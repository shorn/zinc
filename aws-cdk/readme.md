Initialised via `npx aws-cdk init --language typescript` on 2022-04-01.

### Running you own copy

The `package.json` specifies the `cognito-poc` profile in all its scripts, 
so setup your credentials/config using standard AWS profile mechanism. 

`~/.aws/credentials`:
```
[cognito-poc]
# account: 9999, user: aws-cdk-user
aws_access_key_id=AKIAxxx
aws_secret_access_key=xxx
```

`~/.aws/config`:
```
[profile user1]
region=us-east-1
```

This config will defines the account/region that the CDK will use to create
resources.
