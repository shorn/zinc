import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool
} from "amazon-cognito-identity-js";
import React from "react";
import { Stack, TextField } from "@mui/material";
import { PrimaryButton } from "Component/AppButton";
import { CompactErrorPanel } from "Error/CompactErrorPanel";
import { TextSpan } from "Component/TextSpan";
import { ErrorInfo } from "Error/ErrorUtil";
import { EmailFieldState } from "Auth/Email/EmailTabContainer";
import { useSignInContext } from "Auth/AuthProvider";
import { EmailOutlined } from "@mui/icons-material";

export type EmailSignInState =
  {status: "succeeded", email: string} |
  {status: "not-confirmed", email: string} |
  {status: "error", error: ErrorInfo}

export function SignInContainer({
  pool,
  onSignInSucceeded,
  emailState,
}: {
  pool: CognitoUserPool
  onSignInSucceeded: () => void,
  emailState: EmailFieldState,
}){
  const [state, setState] = React.useState(
    {status: "init"} as {status: "init"} | {status: "authenticating"} |
      EmailSignInState
  );
  const [password, setPassword] = React.useState("");
  const signInContext = useSignInContext();
  const [email, setEmail] = emailState;
  
  async function emailSignIn(email: string, password: string){
    setState({status: "authenticating"});
    signInContext.setAction("authenticating");

    try {
      const result = await resolveEmailSignIn({pool, email, password});
      setState(result);
      if( result.status === "succeeded" ){
        onSignInSucceeded();
      }
    }
    finally {
      signInContext.setAction(undefined);
    }
  }

  const isWorking = state.status === "authenticating";
  return <>
    <form onSubmit={(e) => {
      e.preventDefault();
      // noinspection JSIgnoredPromiseFromCall
      emailSignIn(email, password);
    }}>
      <Stack spacing={1}>
        <TextField id="email" label="Email" type="email" fullWidth
          disabled={isWorking}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <TextField id="password" label="Password" type="password" fullWidth
          disabled={isWorking}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <div style={{display: "flex", flexWrap: "wrap", gap: ".5em"}}>
          <PrimaryButton startIcon={<EmailOutlined/>} 
            type={"submit"} isLoading={isWorking}
            disabled={!!signInContext.action  || !email || !password}>
            Sign in
          </PrimaryButton>
          {state.status === "error" &&
            <CompactErrorPanel error={state.error}/>
          }
          {state.status === "not-confirmed" &&
            <TextSpan>Email {state.email} has not been confirmed - please click
              on the verify link in the email that was sent to you,
              then sign in.
            </TextSpan>
          }
        </div>
      </Stack>
    </form>
  </>
}

/** Authenticating email users, but also handles "unconfirmed" users
 * (i.e. haven't verified their email address) and forced password changes.
 */
export async function resolveEmailSignIn({pool, email, password}: {
    pool: CognitoUserPool,
    email: string,
    password: string,
  }
): Promise<EmailSignInState>{
  return new Promise<EmailSignInState>((resolve) => {
      // https://github.com/aws-amplify/amplify-js/tree/master/packages/amazon-cognito-identity-js
      const user = new CognitoUser({Username: email, Pool: pool});
      user.authenticateUser(
        new AuthenticationDetails({Username: email, Password: password}), {
          onSuccess: function(result){
            console.debug("authnUser.onSuccess", result);
            return resolve({status: "succeeded", email});
          },

          onFailure: function(err){
            console.debug("authnUser.onFailure()", err.message, err.code);
            if( err.code === "UserNotConfirmedException" ){
              return resolve({status: "not-confirmed", email});
            }
            else {
              return resolve({
                status: "error", error: {
                  message: err.message,
                  problem: err,
                }
              });
            }
          },

          newPasswordRequired: (userAttributes, requiredAttributes) => {
            // if admin creates the user, status goes to "force change password"
            // and user ends up here when they try to sign in
            console.debug("newPasswordRequired",
              userAttributes, requiredAttributes);

            // returned but not valid to submit
            delete userAttributes.email_verified;
            delete userAttributes.email;
            console.debug("confirm with attributes", userAttributes);

            /* complete the sign-up process by confirming the password.
            Suitable for our demo use-case, but you'd wanna implement a proper 
            password change here for a real app. */
            user.completeNewPasswordChallenge(password, userAttributes, {
              onSuccess: function(result){
                console.debug("passwordChallenge.onSuccess", result);
                return resolve({status: "succeeded", email});
                /* user status in cognito console will now be "confirmed", but 
                email is not verified if admin did not click the checkbox */
              },

              onFailure: function(err){
                /* can get error:  Input attributes include non-writable 
                 attributes for the client if pool/client is not configured
                 properly. */
                console.error("passwordChallenge.onFailure()",
                  err.message, err.code);
                return resolve({
                  status: "error", error: {
                    message: "failed",
                    problem: err,
                  }
                });
              },
            });
          },
        }
      );
    }
  );
}
