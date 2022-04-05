## Manual creation of AWS resources for aws-cdk to use

### Create an IAM user for the CDK to use

If the account is an "organisation account" (being created under and
billed under some other account):
* go to https://aws.amazon.com/console/, click "sign in" at the top right
* make sure "root account" is selected and enter the email you were given for
  the account
* click "forgot password" to set the initial password for the root account
    * make it a good password, save it somewhere safe - I use Keepass


* Log in to your AWS root account.
* Go to IAM console and create user `aws-cdk-user`.
    * enable `password`
        * store your password somewhere safe
    * don't enable `access key` - do it in IAM after logging in as the user
    * attach user directly to `AdministratorAccess`
        * this is role is very powerful, ideally you should use a more
          restricted role
* Write down your account number (will need it to log in to the IAM user)
* Immediately log out of your root account
* Log in to the `aws-cdk-user` IAM account you created previously
* Find the use in the IAM console and create an "Access key"
    * you will store these credentials in the `~/.aws` directory as outlined in
      the next section 


