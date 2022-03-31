import React from "react";
import {AuthenticationDetails, CognitoUser} from "amazon-cognito-identity-js";
import {ContainerCard} from "Design/ContainerCard";
import {TextField} from "@mui/material";
import {PrimaryButton} from "Component/AppButton";
import {CompactErrorPanel} from "Error/CompactErrorPanel";
import {emailPool} from "Auth/AuthenticationProvider";

export function EmailSignInContainer({
  initEmail = "", initPassword = "", 
  onSignInSucceeded
}: {
  initEmail?: string, initPassword?: string, 
  onSignInSucceeded: () => void,
}){
  const [status, setStatus] = React.useState(
    "init" as "init" |
      "authenticating" | "completingPassword" |
      "succeeded" | "confirmRequired" | "failed"
  );
  const [error, setError] = React.useState(undefined as undefined | string);
  const [email, setEmail] = React.useState(initEmail);
  const [password, setPassword] = React.useState(initPassword);

  async function emailSignIn(email: string, password: string){
    setStatus("authenticating");
    setError(undefined);

    // https://github.com/aws-amplify/amplify-js/tree/master/packages/amazon-cognito-identity-js
    const user = new CognitoUser({Username: email, Pool: emailPool});
    user.authenticateUser(
      new AuthenticationDetails({Username: email, Password: password}), {
        onSuccess: function(result){
          console.log("authnUser.onSuccess", result);
          setStatus("succeeded");
          onSignInSucceeded();
        },

        onFailure: function(err){
          console.log("authnUser.onFailure()", err.message, err.code);
          if( err.code === "UserNotConfirmedException" ){
            // if user had not clicked confirm link in the email invitation
            setStatus("confirmRequired");
            return;
          }
          setStatus("failed");
          setError(err.message);
        },

        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // if admin creates the user, status goes to "force change password"
          // and user ends up here when they try to sign in
          console.log("newPasswordRequired",
            userAttributes, requiredAttributes);

          // user.getSession((error: Error | null,
          //   session: CognitoUserSession
          // ) => {
          //   // will receive Error: Local storage is missing an ID Token, Please authenticate
          //   console.log("getSession()", error?.message, session);
          // });
          //

          // returned but not valid to submit
          delete userAttributes.email_verified;
          delete userAttributes.email;
          console.log("confirm with attributes", userAttributes);

          setStatus("completingPassword");
          // complete the sign-up process by confirming the password
          user.completeNewPasswordChallenge(password, userAttributes, {
            onSuccess: function(result){
              console.log("passwordChallenge.onSuccess", result);
              setStatus("succeeded");
              /* user status will now be "confirmed", but email is not verified
               if admin did not click the checkbox */
            },

            onFailure: function(err){
              /* can get error:  Input attributes include non-writable 
               attributes for the client if pool/client is not configured
               properly. */
              console.log("passwordChallenge.onFailure()",
                err.message, err.code);
              setStatus("failed");
              setError(err.message);
            },
          });
        },
      }
    );
  }

  const isWorking = status === "authenticating" ||
    status === "completingPassword";
  return <ContainerCard title={"Email Sign in"}>
    <form onSubmit={(e) => {
      e.preventDefault();
      console.log("sign in clicked");
      // noinspection JSIgnoredPromiseFromCall
      emailSignIn(email, password);
    }}>
      <TextField type="email" fullWidth disabled={isWorking}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <TextField type="password" fullWidth disabled={isWorking}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
      />
      <PrimaryButton type={"submit"} isLoading={isWorking} disabled={isWorking}>
        Signin
      </PrimaryButton>
      <CompactErrorPanel error={error}/>
    </form>
  </ContainerCard>
}