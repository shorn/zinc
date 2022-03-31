import React, { useContext } from "react";
import { LargeContentMain, SmallContentMain } from "Design/LayoutMain";
import { Typography } from "@mui/material";
import {
  cognitoPocGithubUrl,
  muiUrl,
  NewWindowLink
} from "Component/ExternalLinks";
import {
  CognitoAccessToken,
  CognitoIdToken,
  CognitoUserPool,
  CognitoUserSession
} from "amazon-cognito-identity-js";
import { Config } from "Config";
import { SmallPageSpinner } from "Component/SmallPageSpinner";
import { EmailContainer, resolveEmailSession } from "Auth/EmailSignInContainer";
import { ErrorInfoComponent } from "Error/ErrorInforComponent";
import { ErrorInfo } from "Error/ErrorUtil";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton, SecondaryButton } from "Component/AppButton";
import { TextSpan } from "Component/TextSpan";
import { parseJwtDate } from "Util/DateUtil";

export const emailPool = new CognitoUserPool({
  UserPoolId: Config.cognitoEmailUserPoolId,
  ClientId: Config.cognitoEmailUserPoolClientId,
});

/*
UserPool without IdentityPool cannot do auto-refresh
https://github.com/aws-amplify/amplify-js/issues/3619#issuecomment-510654531
 */
export const googlePool = new CognitoUserPool({
  UserPoolId: Config.cognitoGoogleUserPoolId,
  ClientId: Config.cognitoGoogleUserPoolClientId,
});

export interface AuthenticationState {
  signOut: ()=>void,
  email: string,
}

const AuthenticationContext = React.createContext({} as AuthenticationState );
export const useAuthn = ()=> useContext(AuthenticationContext);

export type AuthnState =
  // in-progress
  { status: "init" } |
  { status: "getting-session" } |
  { status: "signing-out" } |
  
  // terminal states
  { status: "not-logged-in" } |
  { status: "error", error: ErrorInfo } |
  { status: "unverified-email", email: string } |
  { status: "logged-in", session: CognitoUserSession } 
; 

function debugSession(session: CognitoUserSession){
  const idToken = session.getIdToken();
  const payload = idToken.payload;
  console.debug("idToken", {
    exp: parseJwtDate(payload.exp),
    iat: parseJwtDate(payload.iat),
    auth_time: parseJwtDate(payload.auth_time),
  })
}


async function resolveGoogleAuthn(pool: CognitoUserPool): Promise<AuthnState>{
  return new Promise<AuthnState>((resolve, reject)=> {
    const user = pool.getCurrentUser();
    console.debug("resolveGoogleAuthn()", user);

    const parsedHash = new URLSearchParams(
      window.location.hash.substring(1) // skip the first char (#)
    );    
    
    const IdToken = parsedHash.get("id_token");
    // console.log("id_token", IdToken);
    if( !IdToken ){
      console.log("no IdToken", window.location.hash);
      resolve({status: "not-logged-in"});
      return;

    }
    const AccessToken = parsedHash.get("access_token");
    if( !AccessToken ){
      console.log("no AccessToken", window.location.hash);
      resolve({status: "not-logged-in"});
      return;
    }
    
    const session = new CognitoUserSession({
      IdToken: new CognitoIdToken({IdToken}),
      AccessToken: new CognitoAccessToken({AccessToken}) 
    })
    
    // don't leave tokens in the url
    window.location.hash = "";
    
    resolve({status: "logged-in", session});
  });  
}

export async function resolveSignOutFromAll(): Promise<void>{
  return new Promise((resolve, reject) =>{
    console.log("signing out from all");
    if( emailPool.getCurrentUser() ){
      console.log("signing out email");
      emailPool.getCurrentUser()?.signOut(()=>{
        console.log("signed out from email")
        return resolve();
      });
    }
    else if( googlePool.getCurrentUser() ){
      console.log("signing out google");
      googlePool.getCurrentUser()?.signOut(()=>{
        console.log("signed out from google")
        return resolve();
      });
    }
    else {
      console.log("nothing logged in, nothing to signOut from");
      return resolve();
    }
  });
}

export function AuthenticationProvider({children}: {children: React.ReactNode}){
  const [state, setState] = React.useState<AuthnState>({status:"init"});
  
  const checkLoginState = React.useCallback( async () => {
    setState({status: "getting-session"});
    try {
      const emailUser = emailPool.getCurrentUser();
      const googleUser = googlePool.getCurrentUser();
      console.log("checkLoginState() email,google", emailUser, googleUser);
      if( emailUser ){
        console.log("resolving email authn");
        const emailState = await resolveEmailSession(emailPool);
        setState(emailState);
        if( emailState.status !== "not-logged-in" ){
          // don't fire the google check
          return;
        }
      }

      console.log("resolving google authn");
      const googleState = await resolveGoogleAuthn(emailPool);
      setState(googleState);
      
    }
    catch( e ){
      setState({status: "error", error: {
        message: "while getting email session", 
        problem: e
      }});
    }
  }, []);  
  
  const signOut = React.useCallback(async ()=>{
    setState({status: "signing-out"});
    await resolveSignOutFromAll();
    // this should result in "not-logged-in" state
    await checkLoginState();
    console.log("signOut() checkLogingState done");
  }, [checkLoginState]);
  
  React.useEffect(()=>{
    try {
    // noinspection JSIgnoredPromiseFromCall
      checkLoginState();
    } catch( e ){
      setState({
        status: "error", error: {
          message: "while calling checkLoginState()",
          problem: e
        }
      });
    }
  }, [checkLoginState]);
  
  React.useEffect(()=>{
    console.log("state", state);
  }, [state]);
  
  if( state.status === "init" || state.status === "getting-session" ){
    return <SmallPageSpinner message={"Signing in"}/>
  }

  if( state.status === "signing-out" ){
    return <SmallPageSpinner message={"Signing out"}/>
  }

  if( state.status === "error" ){
    return <ErrorInfoComponent error={state.error}/>
  }
  
  if( state.status === "unverified-email" ){
    return <SmallContentMain>
      <Typography paragraph>
        You are attempting to sign in as:{" "} 
        <TextSpan noWrap>{state.email}</TextSpan>
      </Typography>
      <Typography>
        You must verify the email address by clicking the link in the email
        that was sent.
      </Typography>
      <Typography paragraph>
        <SecondaryButton onClick={()=>{
          // noinspection JSIgnoredPromiseFromCall
          signOut();
        }}>
          Sign out 
        </SecondaryButton> 
      </Typography>
    </SmallContentMain>
  }
  
  if( state.status === "not-logged-in" ){
    return <LargeContentMain>
      <IntroContainer/>
      <SmallContentMain>
        <EmailContainer pool={emailPool}
          onSignInSucceeded={() => {
            // noinspection JSIgnoredPromiseFromCall
            checkLoginState();
          }}
        />
        <br/>
        <GoogleSignInContainer />
        
      </SmallContentMain>
    </LargeContentMain>
  }
  
  if( !state.session.getIdToken() ){
    return <ErrorInfoComponent error={{
      message: "session has no IdToken", 
      problem: state.session
    }}/>
  }
  
  if( !state.session.getIdToken().payload ){
    return <ErrorInfoComponent error={{
      message: "IdToken has no payload", 
      problem: state.session
    }}/>
  }
  
  debugSession(state.session);
  
  return <AuthenticationContext.Provider value={{
    signOut: signOut,
    email: state.session.getIdToken().payload.email,
  }}>
    {children}
  </AuthenticationContext.Provider>;
}

export function IntroContainer(){
  return <SmallContentMain center>
    <Typography paragraph>This is is a demo app I built to learn about
      AWS Cognito.
      The UI is built using React and the <NewWindowLink href={muiUrl}>
        MUI</NewWindowLink> framework.
    </Typography>
    <Typography>You can find the source code for the App
      on <NewWindowLink href={cognitoPocGithubUrl}>Github</NewWindowLink>.
    </Typography>
  </SmallContentMain>
}

function getCognitoGoogleLoginDomain(){
  return `https://${Config.cognitoGoogleUserPoolDomain}`+
    `.auth.${Config.cognitoAwsRegion}.amazoncognito.com`
}

export function GoogleSignInContainer(){
  const [isWorking, setIsWorking] = React.useState(false);

  async function googleSignIn(){
    const redirectUri = serverLocationUrl();
    console.debug("redirect to:", redirectUri);
    const googleLoginUrl = getCognitoGoogleLoginDomain() +
      "/login?response_type=token" +
      `&client_id=${Config.cognitoGoogleUserPoolClientId}` +
      `&redirect_uri=${redirectUri}`
    setIsWorking(true);
    navBrowserByAssign(googleLoginUrl);
  }

  return <ContainerCard title={"Google"}>
    <form onSubmit={(e) => {
      e.preventDefault();
      // noinspection JSIgnoredPromiseFromCall
      googleSignIn();
    }}>
      <PrimaryButton type={"submit"} isLoading={isWorking} disabled={isWorking}>
        Google sign in
      </PrimaryButton>
    </form>
  </ContainerCard>
}


