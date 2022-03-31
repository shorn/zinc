/*
Instructions for configuring the google side, including where to get the 
client id/secret:
https://aws.amazon.com/premiumsupport/knowledge-center/cognito-google-social-identity-provider/

https://poc-google-pool-domain.auth.us-east-1.amazoncognito.com/login?response_type=token&client_id=740eqti97befq4ruaciv6afpcn&redirect_uri=http://localhost:9090
redirects to:
http://localhost:9090/
#access_token=xxx.yyy.zzz
&id_token=xxx.yyy.zzz
&token_type=Bearer&expires_in=3600
*/
resource "aws_cognito_identity_provider" "poc-google-id-provider" {
  user_pool_id = aws_cognito_user_pool.poc-google-user-pool.id

  # apparently, provider_name has to be "Google" or you get: 
  # Error creating Cognito Identity Provider: InvalidParameterException: Provider poc-google-id-provider cannot be of type Google.
  provider_name = "Google"
  provider_type = "Google"

  /* the ssm params are initially created with the dummy values ("xxx"), 
  you must manually change them in the AWS console, then re-apply so that the 
  new values get picked up.
  View under "sign-in experience/Federated identity provider sign-in/Google".
  Ignore provider_details so TF won't detect changes all the time. 
  */
  lifecycle {
    ignore_changes = [provider_details]
  }
  provider_details = {
    authorize_scopes = "profile email openid"
    client_id        = aws_ssm_parameter.google-credentials-client-id.value
    client_secret    = aws_ssm_parameter.google-credentials-client-secret.value
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    username       = "sub"
  }
}

resource "aws_cognito_user_pool_client" "poc-google-pool-client" {
  name = "poc-google-pool-client"

  user_pool_id = aws_cognito_user_pool.poc-google-user-pool.id

  allowed_oauth_flows_user_pool_client = true
  // when it was just "code", I was getting "unauthorized client" from the cognito /login url
//  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls        = ["http://localhost:9090"]
  default_redirect_uri = "http://localhost:9090"

  enable_token_revocation = true

  explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]

  generate_secret = false

  logout_urls = []

  prevent_user_existence_errors = "ENABLED"

  supported_identity_providers = [
    aws_cognito_identity_provider.poc-google-id-provider.provider_name
  ]

  token_validity_units {
    id_token      = "hours"
    refresh_token = "days"
    access_token  = "hours"
  }
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

}

resource "aws_cognito_user_pool" "poc-google-user-pool" {
  name = "poc-google-user-pool"
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
    minimum_length                   = 6
    require_lowercase                = false
    require_numbers                  = false
    require_symbols                  = false
    require_uppercase                = false
    temporary_password_validity_days = 7
  }
}

resource "aws_cognito_user_pool_domain" "poc-google-pool-domain" {
  domain       = "poc-google-pool-domain"
  user_pool_id = aws_cognito_user_pool.poc-google-user-pool.id
}


/*
"access_token":
{
  "sub": "...",
  "cognito:groups": [
    "us-east-1_V2OCab9yu_Google"
  ],
  "token_use": "access",
  "scope": "openid profile email",
  "auth_time": 1648612901,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_V2OCab9yu",
  "exp": 1648616501,
  "iat": 1648612901,
  "version": 2,
  "jti": "7906d0e4-bae7-420b-9178-e5cde3e27925",
  "client_id": "740eqti97befq4ruaciv6afpcn",
  "username": "google_..."
}
"id token":
{
  "at_hash": "...",
  "sub": "...",
  "cognito:groups": [
    "us-east-1_V2OCab9yu_Google"
  ],
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_V2OCab9yu",
  "cognito:username": "google_...",
  "aud": "740eqti97befq4ruaciv6afpcn",
  "identities": [
    {
      "userId": "...",
      "providerName": "Google",
      "providerType": "Google",
      "issuer": null,
      "primary": "true",
      "dateCreated": "1648611431964"
    }
  ],
  "token_use": "id",
  "auth_time": 1648612994,
  "exp": 1648616594,
  "iat": 1648612994,
  "jti": "4679b91e-a8e7-4090-83c6-747f8b51b65a",
  "email": "...@gmail.com"
}
*/
