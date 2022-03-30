import {NavTransition} from "Design/NavigationProvider";
import React from "react";
import {CardMargin, ContainerCard} from "Design/ContainerCard";
import {FlexContentMain} from "Design/LayoutMain";
import {TextSpan} from "Component/TextSpan";
import {PrimaryButton, SecondaryButton} from "Component/AppButton";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool, CognitoUserSession,
} from "amazon-cognito-identity-js";
import {SmallPageSpinner} from "Component/SmallPageSpinner";
import {TextField} from "@mui/material";

const log = console;

const url = "/login";

export function getLoginPageLink(): string{
  return url;
}

export function isLoginPagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(url);
}

export function LoginPage(){
  return <NavTransition isPath={isLoginPagePath} title={"POC - login"}>
    <Content/>
  </NavTransition>
}

const tfEmailPocUserPoolId = "us-east-1_XH4uV1BPd";
const tfEmailPocUserPoolClientId = "5dqa18blg48cnavccajm0635ip";

const manualEmailPocUserPoolId = "us-east-1_JQvR84lRA";
const manualEmailPocUserPoolClientId = "7egucg7b1dire99e1dj3jvau3h";

const initEmail = "kopi.prd+20220330-signup1@gmail.com";
const initPassword = "xxxxxx";

function Content(){
  return <FlexContentMain>
    <CardMargin>
      <CurrentStatusContainer/>
      <br/>
      <EmailSignInContainer initEmail={initEmail} initPassword={initPassword} />
      <br/>
      <EmailSignUpContainer initEmail={initEmail} initPassword={initPassword} />
    </CardMargin>
  </FlexContentMain>
}

const pool = new CognitoUserPool({
  UserPoolId: tfEmailPocUserPoolId,
  ClientId: tfEmailPocUserPoolClientId,
});
// const pool = new CognitoUserPool({
//   UserPoolId: manualEmailPocUserPoolId,
//   ClientId: manualEmailPocUserPoolClientId,
// });

function EmailSignInContainer({initEmail, initPassword}:{
  initEmail: string,
  initPassword: string,
}){
  const [isWorking, setIsWorking] = React.useState(false);
  const [email, setEmail] = React.useState(initEmail);
  const [password, setPassword] = React.useState(initPassword);

  async function cognitoSignIn(email: string, password: string){
    setIsWorking(true);

    // https://github.com/aws-amplify/amplify-js/tree/master/packages/amazon-cognito-identity-js
    const user = new CognitoUser({Username: email, Pool: pool});
    user.authenticateUser(
      new AuthenticationDetails({Username: email, Password: password}), {
        onSuccess: function(result){
          console.log("authnUser.onSuccess", result);
          setIsWorking(false);
        },

        onFailure: function(err){
          console.log("authnUser.onFailure()", err.message, err.code, err.statusCode);
          if( err.code === "UserNotConfirmedException" ){
            // if user had not clicked confirm link in the email invitation
            console.log("user must click confirm!")
          }
          setIsWorking(false);
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // if admin creates the user, status goes to "force change password"
          // and user ends up here if they try to "sign in"
          console.log("newPasswordRequired()",
            userAttributes,
            requiredAttributes);

          user.getSession((error: Error | null,
            session: CognitoUserSession
          ) => {
            // will receive Error: Local storage is missing an ID Token, Please authenticate
            console.log("getSession()", error?.message, session);
          });

          delete userAttributes.email_verified; // returned but not valid to submit
          delete userAttributes.email;
          console.log("confirm with attributes", userAttributes);
          // complete the 
          user.completeNewPasswordChallenge(password, userAttributes, {
            onSuccess: function(result){
              console.log("completeNewPasswordChallenge.onSuccess", result);
              setIsWorking(false);
              // user status will now be "confirmed", but email is not verified
            },

            onFailure: function(err){
              // currently error:  Input attributes include non-writable attributes for the client 7o5uc1fotinemmvn3is8sell1o.
              console.log("completeNewPasswordChallenge.onFailure()",
                err.message);
              setIsWorking(false);
            },
          });
        },
      }
    );
  }

  return <ContainerCard title={"Sign in"}>
    <form onSubmit={(e) => {
      e.preventDefault();
      console.log("sign in clicked");
      // noinspection JSIgnoredPromiseFromCall
      cognitoSignIn(email, password);
    }}>
      <TextField fullWidth disabled={isWorking} value={email} onChange={(e) => {
        setEmail(e.target.value);
      }}/>
      <TextField fullWidth disabled={isWorking} value={password} onChange={(e) => {
        setPassword(e.target.value);
      }}/>
      <PrimaryButton type={"submit"} isLoading={isWorking} disabled={isWorking}> 
        Signin
      </PrimaryButton>
    </form>
  </ContainerCard>

}

function CurrentStatusContainer(){
  const [isLoadingSession, setIsLoadingSession] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState(
    undefined as undefined | "not logged in" | string);
  const [userEmailVerfied, setUserEmailVerified] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  React.useEffect(() => {
    const user = pool.getCurrentUser();
    if( !user ){
      setUserEmail("not logged in");
      return;
    }
    setIsLoadingSession(true);
    user.getSession((
      error: Error | null,
      session1: null | CognitoUserSession
    ) => {
      if( error ){
        console.log("problem calling getSession()", error.message);
        return;
      }
      // console.log("getCurrentUser()", pool.getCurrentUser());
      // console.log("getSignInUserSession()", user.getSignInUserSession());

      if( session1 == null ){
        console.log("no session was got");
        setUserEmail("not logged in");
        setIsLoadingSession(false);
        return;
      }

      const email: string | undefined = session1.getIdToken().payload.email;
      const emailVerified = Boolean(session1.getIdToken().payload.email_verified);
      console.log("idToken.payload", emailVerified, session1.getIdToken().payload);

      if( !email ){
        setUserEmail("not logged in");
        setIsLoadingSession(false);
        return;
      }
      setUserEmail(email);
      setUserEmailVerified(emailVerified);
      setIsLoadingSession(false);

    });

  }, []);

  if( isLoadingSession ){
    return <SmallPageSpinner message="loading user details"/>
  }

  if( !userEmail ){
    return null;
  }

  const user = pool.getCurrentUser();
  return <ContainerCard title={"Current status"}>
    <TextSpan>Current user: {userEmail}</TextSpan>
    <br/>
    { user && <>
      <TextSpan>Email verified: {userEmailVerfied ? "yes":"no"}</TextSpan>
      <br/>
      <SecondaryButton isLoading={isSigningOut} onClick={() => {
        setIsSigningOut(true);
        user.signOut(() => {
          setIsSigningOut(false);
          setUserEmail(undefined);
        })
      }}>Sign out</SecondaryButton>
    </> }      
  </ContainerCard>

}

function EmailSignUpContainer({initEmail, initPassword}:{
  initEmail: string,
  initPassword: string,
}){
  const [isWorking, setIsWorking] = React.useState(false);
  const [email, setEmail] = React.useState(initEmail);
  const [password, setPassword] = React.useState(initPassword);

  async function cognitoSignUp(email: string, password: string){
    setIsWorking(true);

    // https://github.com/aws-amplify/amplify-js/tree/master/packages/amazon-cognito-identity-js
    // const user = new CognitoUser({Username: email, Pool: pool});
    pool.signUp(email, password, [], [], (err, result) => {
      console.log("signUp()", result, err?.message);
      
      setIsWorking(false);
      
    });
  }

  return <ContainerCard title={"Sign up"}>
    <form onSubmit={(e) => {
      e.preventDefault();
      console.log("sign up clicked");
      // noinspection JSIgnoredPromiseFromCall
      cognitoSignUp(email, password);
    }}>
      <TextField fullWidth disabled={isWorking} value={email} onChange={(e) => {
        setEmail(e.target.value);
      }}/>
      <TextField fullWidth 
        disabled={isWorking} value={password} 
        onChange={(e) => {
          setPassword(e.target.value);
        }
        }/>
      <PrimaryButton type={"submit"} isLoading={isWorking} disabled={isWorking}>
        Sign up
      </PrimaryButton>
    </form>
  </ContainerCard>

}
