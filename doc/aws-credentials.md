The aws-infra project manages all AWS resources via the `aws-cdk`.
It specifies the `cognito-poc` profile in all its scripts,
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
[profile cognito-poc]
region=us-east-1
```

The access key defines the account that the CDK will use to create
resources, the region comes from the `config` file.
