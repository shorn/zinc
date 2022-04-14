# Running your own infrastructure

## Pre-requisites

* Node/NPM available on the path
* AWS account ID/alias
    * preferrably, you should use a "sub-account" to play with stuff like this
* AWS Access key to run the CDK with
    * Never use the "root account" of an AWS account to do stuff, follow these
      [instructions](create-iam-account.md) for creating an IAM account and
      access key

## Configure AWS credentials

Most people would run this project from a developer machine - in which case
you'll needed [set up credentials](aws-credentials.md) for the
`cognito-poc` profile.

## Bootstrap the AWS-CDK and do initial deployment
* `cd <repo>/aws-infra`
* `npm run bootstrap`
    * this will create an S3bucket and other resources that aws-cdk uses to
      manage deployments
* `npm run deploy`
    * this will deploy all CDK stacks
    * note that the CloudFrontStack deploys files from dir `<repo>/client/build`
      that are generated by the client build, but since we haven't yet
      built the client, there won't be anthing in there at this point

## Configure Google dev console and Cognito Google credentials
* configure credentials and consent screen in Google dev console
    * There are some instructions here: https://aws-cdk.com/cognito-google/ but
      Google change this UI frequently.  The key things you need to set up are:
        * the `Credentials` "Authorized JavaScript origins" and
          "Authorized redirect URIs"
        * the `OAuth consent screen` "Authorized domains"
* configure the Cognito Google pool with the credentials from Google dev console
    * look in "/ Cognito user pool / Sign-in experience /
      Federated identity provider sign-in / Google", though Amazon are also
      prone to changing their UI too

## Configure the SSM parameters that configure the lambda
* go to the AWS SSM parameter store console, there will be various SSM params
  with value "set me in the console"
* copy the values from teh various `Ouputs` sections in the output of the
  `deploy` script (you can safely re-run `deploy` if needed)
```
Outputs:
CognitoEmailStack.CognitoEmailStackCognitoEmailUserPoolClientId = xxx
CognitoEmailStack.CognitoEmailStackCognitoEmailUserPoolId = region_xxx

Outputs:
CognitoGoogleStackV2.CognitoGoogleStackV2CognitoGoogleUserPoolClientId = xxx
CognitoGoogleStackV2.CognitoGoogleStackV2CognitoGoogleUserPoolDomain = domain-name
CognitoGoogleStackV2.CognitoGoogleStackV2CognitoGoogleUserPoolId = region_xxx
CognitoGoogleStackV2.CognitoGoogleStackV2CognitoGoogleUserPoolRegion = region
```

## Build and deploy the client app
* `cd <repo>/client`
* `npm run build-prd`
    * this will build the client web app suitable for deploying to CloudFront
* `cd <repo>/aws-infra`
* `npm run deploy-cloudfront`
    * this will pick up the generated files from `<repo>/client/build`, upload
      them to the S3 bucket and clear the CloudFront cache

That's it - you should now be able to navigate to the URL for the app and
sign in (look in the CloudFront console under "Distribution domain name",
there's also an "Output" for the CloudFront domain printed by `deploy`).