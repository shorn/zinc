resource "aws_cognito_user_pool" "poc-email-user-pool" {
  name = "poc-email-user-pool"
  tags = {}

  /* Use the email address as the username, sort of.
  You use the user's email address in the "username" fields when calling
  signUp/signIn methods.
  Cognito will assign a random "username" (like a UUID), and that will 
  be what you see in the username field in the Cognito console and 
  currentUser/session fields. 
  */
  username_attributes = [
    "email"
  ]

  username_configuration {
    // emails are not case sensitive
    case_sensitive = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  verification_message_template {
    # this means you must have a domain - the link emailed to the user will 
    # look something like: 
    # https://poc-email-pool-domain.auth.us-east-1.amazoncognito.com/confirmUser?client_id=<poc-email-pool-client.id>&user_name=xxx&confirmation_code=999999
    default_email_option  = "CONFIRM_WITH_LINK"
    email_subject_by_link = "cognito-poc verification link"
    email_message_by_link = "Welcome to the Cognito-POC! <br/><br/> {##Click Here##} to confirm your Sign Up"
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "admin cognito-poc invitation"
      email_message = "you are invited to cognito-poc as \"{username}\", password:\"{####}\""
      sms_message   = "you are invited to cognito-poc as \"{username}\", password:\"{####}\""
    }
  }

  auto_verified_attributes = ["email"]

  email_configuration {
    // limited per day I think, prod will need to use SES
    email_sending_account = "COGNITO_DEFAULT"
  }

  password_policy {
    minimum_length                   = 6
    require_lowercase                = false
    require_numbers                  = false
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    # not sure about mutable
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      # default, but I reckon 128 might be better
      max_length = 2048
    }
  }

  schema {
    name                     = "email_verified"
    /* If try to set this as "String", error: 
    You can not change AttributeDataType or set developerOnlyAttribute for standard schema attribute email_verified
    */
    attribute_data_type      = "Boolean"
    developer_only_attribute = false
    /* must be mutable, so Cognito can write to it when user follows confirm 
    link  if set to false, user will see "Internal server error" when clicking 
    link. */
    mutable                  = true
    /* if set to true, Cognito console will fail if you try to create a user 
    without enabling "mark email address as verified" checkbox.
    OTOH, if you do force-create a user that way, they won't be email_verified,
    but Cognito doesn't send a verification email (the "invitation" email has 
    their username (email) and password in it, but not verification link. */
    required                 = false
  }

}

resource "aws_cognito_user_pool_client" "poc-email-pool-client" {
  name = "poc-email-pool-client"

  user_pool_id = aws_cognito_user_pool.poc-email-user-pool.id

  enable_token_revocation = true

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  generate_secret = false

  logout_urls = []

  prevent_user_existence_errors = "ENABLED"

  read_attributes  = ["email", "email_verified"]
  // only cognito sets email_verified, not the client (you'll get an error if 
  // try to set it as a write_attribute anyway).
  write_attributes = ["email"]

  token_validity_units {
    id_token      = "minutes"
    refresh_token = "days"
    access_token  = "minutes"
  }
  access_token_validity  = 5
  id_token_validity      = 5
  refresh_token_validity = 30

  allowed_oauth_flows          = []
  allowed_oauth_scopes         = []
  supported_identity_providers = []
}

// you must have a domain if using CONFIRM_WITH_LINK functionality, the 
// link will be to this domain
resource "aws_cognito_user_pool_domain" "poc-email-pool-domain" {
  domain       = "poc-email-pool-domain"
  user_pool_id = aws_cognito_user_pool.poc-email-user-pool.id
}
