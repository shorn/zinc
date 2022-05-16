import { CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";
import React from "react";
import { ErrorInfo } from "Error/ErrorUtil";
import { Stack, TextField } from "@mui/material";
import { PrimaryButton, SecondaryButton } from "Component/AppButton";
import { CompactErrorPanel } from "Error/CompactErrorPanel";
import { EmailFieldState } from "Auth/Email/EmailTabContainer";

export function ForgotPasswordContainer({
  pool,
  onConfirmed,
  emailState,
}: {
  pool: CognitoUserPool
  onConfirmed: () => void,
  emailState: EmailFieldState,
}){
  const [state, setState] = React.useState({status: "init"} as
    {status: "init"} |
    {status: "sending-code"} |
    {status: "confirming-password"} |
    {status: "verification-sent"} |
    {status: "error", error: ErrorInfo}
  );
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = emailState;

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
  return <div>
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
        <PrimaryButton isLoading={state.status === "confirming-password"}
          disabled={isWorking || !code || !email || !password}
          onClick={() => confirmPassword(email, code, password)}
        >
          Confirm password
        </PrimaryButton>
        {state.status === "error" &&
          <CompactErrorPanel error={state.error}/>
        }
      </div>
    </Stack>
  </div>
}