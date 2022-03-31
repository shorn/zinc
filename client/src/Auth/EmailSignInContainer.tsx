import React from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool, CognitoUserSession
} from "amazon-cognito-identity-js";
import { ContainerCard } from "Design/ContainerCard";
import { Grid, Link, Stack, TextField } from "@mui/material";
import { PrimaryButton, SecondaryButton } from "Component/AppButton";
import { CompactErrorPanel } from "Error/CompactErrorPanel";
import { AuthnState, emailPool } from "Auth/AuthenticationProvider";
import { ErrorInfo } from "Error/ErrorUtil";

export async function resolveEmailSession(
  pool: CognitoUserPool
): Promise<AuthnState>{
  return new Promise<AuthnState>((resolve, reject) => {
    const user = pool.getCurrentUser();
    if( !user ){
      return resolve({status: "not-logged-in"});
    }
    user.getSession((
      error: null | Error,
      session: null | CognitoUserSession,
    ) => {
      if( error ){
        console.log("problem calling getSession()", error.message);
        return resolve({
          status: "error", error: {
            message: "while getting email session",
            problem: error
          }
        });
      }
      // console.log("getCurrentUser()", pool.getCurrentUser());
      // console.log("getSignInUserSession()", user.getSignInUserSession());

      if( session == null ){
        console.log("no session was got");
        return resolve({status: "not-logged-in"});
      }

      if( !session.getIdToken() ){
        return resolve({
          status: "error", error: {
            message: "no session idtoken", problem: session
          }
        });
      }

      if( !session.getIdToken().payload ){
        return resolve({
          status: "error", error: {
            message: "session idtoken has no payload", problem: session
          }
        });
      }

      const email: string | undefined = session.getIdToken().payload.email;
      const emailVerified = Boolean(
        session.getIdToken().payload.email_verified);
      console.log("idToken.payload",
        emailVerified, session.getIdToken().payload);

      if( !email ){
        // defensive logic: never seen this state 
        console.log("session returned with no email",
          session, session.getIdToken(), session.getIdToken()?.payload);
        return resolve({status: "not-logged-in"});
      }

      if( !emailVerified ){
        return resolve({status: "unverified-email", email});
      }

      return resolve({status: "logged-in", session});
    });
  });
}

export type SignInState =
  {status: "succeeded", email: string} |
  {status: "error", error: ErrorInfo}

export async function resolveEmailSignIn({
    pool, email, password
  }: {
    pool: CognitoUserPool,
    email: string,
    password: string,
  }
): Promise<SignInState>{
  return new Promise<SignInState>((resolve, reject) => {
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
              /* if user had not clicked confirm link in the email invitation
               treat it as successfull signin na dlet the  "getSession" logic 
               deal with it */
              return resolve({status: "succeeded", email});
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

            // complete the sign-up process by confirming the password
            user.completeNewPasswordChallenge(password, userAttributes, {
              onSuccess: function(result){
                console.debug("passwordChallenge.onSuccess", result);
                return resolve({status: "succeeded", email});
                /* user status will now be "confirmed", but email is not verified
                 if admin did not click the checkbox */
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

export function EmailContainer({
  pool,
  onSignInSucceeded,
}: {
  pool: CognitoUserPool
  onSignInSucceeded: () => void,
  initEmail?: string, initPassword?: string,
}){
  const [state, setState] = React.useState("signin" as "signin" | "signup" | "forgot");

  const signInButton = <span> 
      <SecondaryButton
        onClick={() => setState("signin")}>Sign in</SecondaryButton>         
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
      SignInState
  );
  const [email, setEmail] = React.useState(initEmail);
  const [password, setPassword] = React.useState(initPassword);

  async function emailSignIn(email: string, password: string){
    setState({status: "authenticating"});

    const result = await resolveEmailSignIn({pool, email, password});
    if( result.status === "succeeded" ){
      onSignInSucceeded();
    }
    setState(result);
  }

  const isWorking = state.status === "authenticating";
  return <ContainerCard title={"Email Sign in"}>
    <form onSubmit={(e) => {
      e.preventDefault();
      console.debug("sign in clicked");
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
          {state.status === "error" &&
            <CompactErrorPanel error={state.error}/>
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
  return <ContainerCard title={"Email Sign up"}>
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
