resource "aws_cognito_user_pool" "poc-user-pool-v2" {
  name = "poc-user-pool-v2"
  tags = {}
  
  // use the email address as the username
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
    default_email_option = "CONFIRM_WITH_LINK"
    email_subject = "cognito-poc verification"
    email_subject_by_link = "cognito-poc verification link"
  }
  
  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "admin cognito-poc invitation"
      email_message = "you are invited to cognito-poc as \"{username}\", password:\"{####}\""
      sms_message = "you are invited to cognito-poc as \"{username}\", password:\"{####}\""
    }
  }
  
  auto_verified_attributes = ["email"]
  
#  device_configuration {
#    device_only_remembered_on_user_prompt = true # true = user opt in
#    challenge_required_on_new_device = true
#  }
  
  email_configuration {
    // limited per day I think, prod will need to use SES
    email_sending_account = "COGNITO_DEFAULT"
  }
  
  password_policy {
    minimum_length = 6
    require_lowercase = false
    require_numbers = false
    require_symbols = false
    require_uppercase = false
    temporary_password_validity_days = 7
  }
  
}

resource "aws_cognito_identity_provider" "poc-google-id-provider-v3" {
  user_pool_id  = aws_cognito_user_pool.poc-google-user-pool-v3.id
  
  # apparently, provider_name has to be "Google" or you get: 
  # Error creating Cognito Identity Provider: InvalidParameterException: Provider poc-google-id-provider cannot be of type Google.
  provider_name = "Google"
  provider_type = "Google"

  /* initially created with the dummy creds below, then you must change them
  manually in the console.
  Ignore provider_details so TF won'tt detect changes when you do. 
  */ 
  
  lifecycle {
    ignore_changes = [provider_details]
  }
  
  provider_details = {
    authorize_scopes = "profile email openid"
    client_id = "xxx"
    client_secret = "xxx"
  }

  attribute_mapping = {
    email    = "email"
    email_verified    = "email_verified"
    username = "sub"
  }

}

resource "aws_cognito_user_pool_client" "poc-google-pool-client-v3" {
  name = "poc-google-pool-client-v3"
  
  user_pool_id = aws_cognito_user_pool.poc-google-user-pool-v3.id

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["email", "openid", "profile"]
  
  callback_urls = ["http://localhost:9090"]
  default_redirect_uri = "http://localhost:9090"
  
  enable_token_revocation = true

  explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]
  
  generate_secret = false
  
  logout_urls = []
  
  prevent_user_existence_errors = "ENABLED"
  
  supported_identity_providers = [aws_cognito_identity_provider.poc-google-id-provider-v3.provider_name]
  
  token_validity_units {
    id_token = "hours"
    refresh_token = "days"
    access_token = "hours"
  }
  access_token_validity = 1
  id_token_validity = 1
  refresh_token_validity = 30
  
}

resource "aws_cognito_user_pool" "poc-google-user-pool-v3" {
  name = "poc-google-user-pool-v3"
  tags = {}
  
  // use the email address as the username
  username_attributes = [
    "email"
  ]

  account_recovery_setting {
    recovery_mechanism {
      name     = "admin_only"
      priority = 1
    }
  }
  
  username_configuration {
    // emails are not case sensitive
    case_sensitive = false
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_LINK"
  }

  email_configuration {
    // limited per day I think, prod will need to use SES
    email_sending_account = "COGNITO_DEFAULT"
  }

  password_policy {
    minimum_length = 6
    require_lowercase = false
    require_numbers = false
    require_symbols = false
    require_uppercase = false
    temporary_password_validity_days = 7
  }
}
