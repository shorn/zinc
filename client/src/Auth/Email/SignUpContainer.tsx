import { CognitoUserPool } from "amazon-cognito-identity-js";
import React from "react";
import { ErrorInfo } from "Error/ErrorUtil";
import { Stack, TextField } from "@mui/material";
import { PrimaryButton } from "Component/AppButton";
import { CompactErrorPanel } from "Error/CompactErrorPanel";
import { EmailFieldState } from "Auth/Email/EmailTabContainer";

export function SignUpContainer({
  pool,
  emailState,
}: {
  pool: CognitoUserPool
  emailState: EmailFieldState,
}){
  const [state, setState] = React.useState(
    {status: "ready"} as
      {status: "ready"} |
      {status: "working"} |
      {status: "error", error: ErrorInfo}
  );
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = emailState;

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
  return <div>
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
  </div>

}