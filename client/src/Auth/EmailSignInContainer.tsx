import React from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool
} from "amazon-cognito-identity-js";
import { ContainerCard } from "Design/ContainerCard";
import { Stack, TextField } from "@mui/material";
import { PrimaryButton, SecondaryButton } from "Component/AppButton";
import { CompactErrorPanel } from "Error/CompactErrorPanel";
import { ErrorInfo } from "Error/ErrorUtil";
import { CognitoEmailConfig } from "shared";
import { TextSpan } from "Component/TextSpan";

export type EmailSignInState =
  {status: "succeeded", email: string} |
  {status: "not-confirmed", email: string} |
  {status: "error", error: ErrorInfo}

export function EmailContainer({
  emailConfig,
  onSignInSucceeded,
}: {
  emailConfig: CognitoEmailConfig
  onSignInSucceeded: () => void,
  initEmail?: string, initPassword?: string,
}){
  const [state, setState] = React.useState("signin" as 
    "signin" | "signup" | "forgot" );
  
  // don't create every render (probably not expensive, but w/e)
  const pool = React.useMemo(()=>{
    return new CognitoUserPool({
      UserPoolId: emailConfig.userPoolId,
      ClientId: emailConfig.userPoolClientId,
    });
  }, [emailConfig.userPoolId, emailConfig.userPoolClientId]);

  const signInButton = <span> 
    <SecondaryButton onClick={() => setState("signin")}>
      Sign in
    </SecondaryButton>         
  </span>;

  const signUpButton = <span> 
    <SecondaryButton onClick={() => setState("signup")}>
      Sign up
    </SecondaryButton>
  </span>;

  const forgotButton = <span> 
    <SecondaryButton onClick={() => setState("forgot")}>
      Forgot Password
    </SecondaryButton>
  </span>;


  if( state === "signin" ){
    return <Stack spacing={1}>
      <EmailSignInContainer pool={pool} onSignInSucceeded={onSignInSucceeded}/>
      {/*span to stop the button from filling the width*/}
      <Stack direction="row" spacing={1}>
        {signUpButton} {forgotButton}
      </Stack>
    </Stack>
  }

  if( state === "signup" ){
    return <Stack spacing={1}>
      <EmailSignUpContainer pool={pool}/>
      <Stack direction="row" spacing={1}>
        {signInButton} {forgotButton}
      </Stack>
    </Stack>
  }

  return <Stack spacing={1}>
    <ForgotPasswordContainer pool={pool}
      onConfirmed={() => setState("signin")}/>
    <Stack direction="row" spacing={1}>
      {signInButton} {signUpButton}
    </Stack>
  </Stack>

}

export function EmailSignInContainer({
  pool,
  onSignInSucceeded,
  initEmail = "", initPassword = "",
}: {
  pool: CognitoUserPool
  onSignInSucceeded: () => void,
  initEmail?: string, initPassword?: string,
}){
  const [state, setState] = React.useState(
    {status: "init"} as {status: "init"} | {status: "authenticating"} |
      EmailSignInState
  );
  const [email, setEmail] = React.useState(initEmail);
  const [password, setPassword] = React.useState(initPassword);

  async function emailSignIn(email: string, password: string){
    setState({status: "authenticating"});

    const result = await resolveEmailSignIn({pool, email, password});
    setState(result);
    if( result.status === "succeeded" ){
      onSignInSucceeded();
    }
  }

  const isWorking = state.status === "authenticating";
  return <ContainerCard title={"Email Sign-in"}>
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
          <PrimaryButton type={"submit"} isLoading={isWorking}
            disabled={isWorking || !email || !password}>
            Signin
          </PrimaryButton>
          { state.status === "error" &&
            <CompactErrorPanel error={state.error}/>
          }
          { state.status === "not-confirmed" &&
            <TextSpan>Email {state.email} has not been confirmed - please click 
              on the verify link in the email that was sent to you, 
              then sign in.
            </TextSpan>
          }
        </div>
      </Stack>
    </form>
  </ContainerCard>
}

function EmailSignUpContainer({initEmail = "", initPassword = "", pool}: {
  initEmail?: string,
  initPassword?: string,
  pool: CognitoUserPool
}){
  const [state, setState] = React.useState(
    {status: "ready"} as
      {status: "ready"} |
      {status: "working"} |
      {status: "error", error: ErrorInfo}
  );
  const [email, setEmail] = React.useState(initEmail);
  const [password, setPassword] = React.useState(initPassword);

  async function cognitoSignUp(email: string, password: string){
    setState({status: "working"});

    // https://github.com/aws-amplify/amplify-js/tree/master/packages/amazon-cognito-identity-js
    // const user = new CognitoUser({Username: email, Pool: pool});
    pool.signUp(email, password, [], [], (err, result) => {
      console.log("signUp()", result, err?.message);
      if( err ){
        setState({
          status: "error", error: {
            message: err.message,
            problem: err
          }
        });
      }
      else {
        // let the "get session" logic in AuthnProvider deal with it
        window.location.reload();
      }
    });
  }

  const isWorking = state.status === "working";
  return <ContainerCard title={"Email Sign-up"}>
    <form onSubmit={(e) => {
      e.preventDefault();
      console.debug("sign up clicked");
      // noinspection JSIgnoredPromiseFromCall
      cognitoSignUp(email, password);
    }}>
      <Stack spacing={1}>
        <TextField id="email" label="Email" type="email" fullWidth
          disabled={isWorking}
          value={email} onChange={(e) => {
          setEmail(e.target.value);
        }}/>
        <TextField id="password" label={"Password"} type={"password"} fullWidth
          disabled={isWorking} value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }
          }/>
        <div style={{display: "flex", flexWrap: "wrap", gap: ".5em"}}>
          <PrimaryButton type={"submit"} isLoading={isWorking}
            disabled={isWorking || !email || !password}>
            Sign up
          </PrimaryButton>
          {state.status === "error" &&
            <CompactErrorPanel error={state.error}/>
          }
        </div>
      </Stack>
    </form>
  </ContainerCard>

}

export function ForgotPasswordContainer({
  pool,
  onConfirmed,
}: {
  pool: CognitoUserPool
  onConfirmed: () => void,
}){
  const [state, setState] = React.useState({status: "init"} as
    {status: "init"} |
    {status: "sending-code"} |
    {status: "confirming-password"} |
    {status: "verification-sent"} |
    {status: "error", error: ErrorInfo}
  );
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function sendCode(email: string){
    setState({status: "sending-code"});

    const forgotUser = new CognitoUser({
      Username: email,
      Pool: pool
    });
    forgotUser.forgotPassword({
      onSuccess: data => {
        console.debug("forgotPassword().onSuccess", data);
        setState({status: "verification-sent"});
      },
      onFailure: err => {
        console.debug("forgotPassword().onFailure", err);
        setState({
          status: "error",
          error: {message: err.message, problem: err}
        });
      },
    })
  }

  async function confirmPassword(email: string, code: string, password: string){
    setState({status: "confirming-password"});
    const forgotUser = new CognitoUser({
      Username: email,
      Pool: pool
    });
    forgotUser.confirmPassword(code, password, {
      onSuccess: data => {
        console.debug("confirmPassword().onSuccess", data);
        onConfirmed();
      },
      onFailure: err => {
        console.debug("confirmPassword().onFailure", err);
        setState({
          status: "error",
          error: {message: err.message, problem: err}
        });
      },
    });
  }

  const isWorking = state.status === "sending-code" ||
    state.status === "confirming-password";
  return <ContainerCard title={"Forgot password"}>
    <Stack spacing={1}>
      <TextField id="email" label="Email" type="email"
        fullWidth disabled={isWorking}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <TextField id="code" label="Code" type="text" fullWidth
        disabled={isWorking}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
        }}
      />
      <TextField id="password" label="New password" type="password" fullWidth
        disabled={isWorking}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
      />
      <div style={{display: "flex", flexWrap: "wrap", gap: ".5em"}}>
        <SecondaryButton isLoading={state.status === "sending-code"}
          disabled={isWorking || !email}
          onClick={() => sendCode(email)}
        >
          Send code
        </SecondaryButton>
        <SecondaryButton isLoading={state.status === "confirming-password"}
          disabled={isWorking || !code || !email || !password}
          onClick={() => confirmPassword(email, code, password)}
        >
          Confirm password
        </SecondaryButton>
        {state.status === "error" &&
          <CompactErrorPanel error={state.error}/>
        }
      </div>
    </Stack>
  </ContainerCard>
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
  return new Promise<EmailSignInState>((resolve, reject) => {
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
