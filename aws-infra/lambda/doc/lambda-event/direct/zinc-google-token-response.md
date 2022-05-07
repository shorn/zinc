This is what comes back from the /token call:
```json
{
  "access_token": "<opaque token>",
  "expires_in": 3598,
  "scope": "https://www.googleapis.com/auth/userinfo.email openid",
  "token_type": "Bearer",
  "id_token": "<JWT>"
}

```

This is what's inside the JWT:
```json
{
  "iss": "https://accounts.google.com",
  "azp": "xxx.apps.googleusercontent.com",
  "aud": "xxx.apps.googleusercontent.com",
  "sub": "<google id>",
  "email": "<email>",
  "email_verified": true,
  "at_hash": "<data>",
  "iat": 1651888693,
  "exp": 1651892293
}
```