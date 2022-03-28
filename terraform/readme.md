This project maintains the AWS account via Terraform.
It runs against AWS and stores it's `.tfstate` in an S3 bucket. 


# Pre-requisites
 
* AWS account ID/alias
* JDK 8+ available on the path of any machine that needs to run Gradle/TF tasks

# Setting up AWS

## Manual creation of AWS resources for Terraform to use

### Create an IAM user for TF to use

Never use the "root account" of an AWS account to do stuff, this should be
the only time you need to log in to the root account.

If the account is an "organisation account" (being created under and 
billed under some other account):
* go to https://aws.amazon.com/console/, click "sign in" at the top right
* make sure "root account" is selected and enter the email you were given for 
the account
* click "forgot password" to set the initial password for the root account
    * make it a good password, save it somewhere safe - I use Keepass 


* Log in to your AWS root account.
* Go to IAM console and create user `terraform-user`.
    * enable `password`
        * store your password somewhere safe
    * don't enable `access key` - do it in IAM after logging in as the user
    * attach user directly to `AdministratorAccess`
        * this is very power
* Write down your account number (will need it to log in to IAM user)
* Immediately log out of your root account


### Configure authorization for Terraform

* sign in as `terraform-user` (will need your Account ID and the password you 
just created)
* In IAM console, find the new user and create an `access key`
    * save access key to `~/.config/cognito-poc/aws.credentials`  
```
[default]
aws_access_key_id=AKIAXXX
aws_secret_access_key=XXX
```


## Create an S3 bucket for TF to store state in

Note that you won't be able to run this task without changing the bucket name
in the `createS3StateBucket` task in the [gradle build](build.gradle)
because AWS S3 buckets must be globally unique.  
May want to change the region too, see 
[S3Util](../buildSrc/src/main/groovy/tfdownload/S3Util.groovy).

* `./gradlew createS3StateBucket`
    * only need to run this once 

# Running Terraform tasks
* start with the `tf-init` gradle task, only need to run it once per machine
    * this initialises local stuff, downloads providers, etc.
    * does *not* create the state file or any other resources
* then run the `tf-plan` task, which runs the TF `plan` command to see what the 
`apply` command would do if run
    * the first time you run `plan` it should show a bunch of things to be 
    created
* then run the `tf-apply` task, which runs the Terraform `apply` command
    * the `apply` creates all the AWS resource and creates a .`tfstate` file in 
    the S3 bucket to track the AWS resources that TF is managing.

If you run `plan` immediately again, you should now see that `apply` will make
no changes because everything is up to date.

If you make changes to AWS resources using the AWS console, then next time you 
run `plan`, TF will detect those changes you made as "drift" and if you run 
`apply` it will reset the AWS resources to configured specified in your `*.tf` 
files.  

USe the AWS console mostly only for viewing things.  Make changes 
to your AWS infrastructure by changing `.tf` sources and running `apply`.

