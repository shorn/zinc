import React, { useContext } from "react";
import { LargeContentMain, SmallContentMain } from "Design/LayoutMain";
import { Typography } from "@mui/material";
import {
  cognitoPocGithubUrl,
  muiUrl,
  NewWindowLink
} from "Component/ExternalLinks";
import { SmallPageSpinner } from "Component/SmallPageSpinner";
import { ErrorInfoComponent } from "Error/ErrorInforComponent";
import { ErrorInfo, isErrorInfo } from "Error/ErrorUtil";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton, SecondaryButton } from "Component/AppButton";
import { TextSpan } from "Component/TextSpan";
import { AuthzTokenPayload, CognitoConfig, ServerInfo } from "shared";
import {
  authorizeWithServer,
  getAuthSessionFromStorage,
  signOutUser
} from "Auth/Authz";
import { EmailContainer } from "Auth/EmailSignInContainer";
import { getEmailCognitoIdToken, getSocialRedirectIdToken } from "Auth/Authn";
import { serverConfigRequest } from "index";

export interface AuthenticationState {
  signOut: ()=>void,
  session: AuthorizedSession,
}

const AuthenticationContext = React.createContext(
  undefined as unknown as AuthenticationState );
export const useAuthn = ()=> {
  let ctx = useContext(AuthenticationContext);
  if( !ctx ){
    throw new Error("No AuthenticationProvider present in component hierarchy");
  }
  return ctx;
};

export interface AuthorizedSession{
  payload: AuthzTokenPayload,
  accessTokenExpiry: Date,
  accessToken: string,
} 

export type AuthnState =
  // in-progress states
  { status: "init" } |
  { status: "reading-config" } |
  { status: "authenticating" } |
  { status: "authorizing" } |
  { status: "signing-out" } |
  
  // terminal states
  { status: "not-signed-in" } |
  { status: "unverified-email", email: string } |
  { status: "signed-in", authSession: AuthorizedSession } |
  { status: "error", error: ErrorInfo } 
; 

export function AuthenticationProvider({children}: {children: React.ReactNode}){
  const [state, setState] = React.useState<AuthnState>({status:"init"});
  const [serverConfig, setServerConfig] = React.useState<CognitoConfig|undefined>(undefined);

  /** 
   * - looks for a non-expired `accessToken` in local storage,
   *   otherwise looks for an `idToken` from signing in with email/social 
   * - exchanges the idToken for an accessToken from the server
   * - save the accessToken to storage for next time
   */
  const checkLoginState = React.useCallback( async () => {
    setState({status: "reading-config"});
    let serverInfo: ServerInfo;
    try {
      serverInfo = await serverConfigRequest;
      console.log("serverInfo", serverInfo);
      setServerConfig(serverInfo.cognito);
    }
    catch( err ){
      setState({
        status: "error", error: {
          message: "There was a problem while loading the page.",
          problem: "Could not contact server."
        }
      });
      return;
    }

    setState({status: "authenticating"});

    const authSession = getAuthSessionFromStorage();
    if( authSession ){
      setState({status: "signed-in", authSession});
      return;
    }
    
    let idToken:string|undefined = getSocialRedirectIdToken();
    if( idToken ){
      console.log("found social idToken")
    }
    else {
      idToken = (await getEmailCognitoIdToken(serverInfo.cognito.email))?.
        getJwtToken();
      if( idToken ){
        console.log("found email idToken");
      }
      else {
        console.log("found no idtoken");
        setState({status: "not-signed-in"});
        return;
      }
    }

    setState({status: "authorizing"});

    const authzResult = await authorizeWithServer(idToken);
    if( isErrorInfo(authzResult) ){
      setState({
        status: "error", error: authzResult
      });
      return;
    }

    setState({ status: "signed-in", authSession: authzResult });
    
  }, []);

  const onSignOutClicked = React.useCallback(async () => {
    if( !serverConfig ){
      return;
    }
    setState({status: "signing-out"});
    await signOutUser({serverConfig});
    // this should result in "not-logged-in" state
    await checkLoginState();
  }, [checkLoginState, serverConfig]);

  React.useEffect(() => {
    //   noinspection JSIgnoredPromiseFromCall
    checkLoginState();
  }, [checkLoginState]);
  
  if( state.status === "init" || state.status === "reading-config" ){
    return <SmallPageSpinner message={"Reading config"}/>
  }

  if( state.status === "authenticating" ){
    return <SmallPageSpinner message={"Signing in"}/>
  }

  if( state.status === "authorizing" ){
    return <SmallPageSpinner message={"Authorizing"}/>
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
        <SecondaryButton onClick={onSignOutClicked}>
          Sign out 
        </SecondaryButton> 
      </Typography>
    </SmallContentMain>
  }
  
  if( state.status === "not-signed-in" ){
    if( !serverConfig ){
      return <ErrorInfoComponent error={{
        message:"Server config must be set by now", 
        problem: state.status
      }}/>
    }
    return <LargeContentMain>
      <IntroContainer/>
      <SmallContentMain>
        <EmailContainer emailConfig={serverConfig.email}
          onSignInSucceeded={() => {
            /* once the user has actually succeeded signing in, this logic 
             will be able to pick that up from the userpool */
            // noinspection JSIgnoredPromiseFromCall
            checkLoginState();
          }}
        />
        <br/>
        <GoogleSignInContainer serverConfig={serverConfig}/>
        
      </SmallContentMain>
    </LargeContentMain>
  }
  
  return <AuthenticationContext.Provider value={{
    signOut: onSignOutClicked,
    session: state.authSession,
  }}>
    {children}
  </AuthenticationContext.Provider>;
}

export function IntroContainer(){
  return <SmallContentMain center>
    <Typography paragraph>This is is a demo app built to learn about
      AWS Cognito.
      The UI is built using React and the <NewWindowLink href={muiUrl}>
        MUI</NewWindowLink> framework.
    </Typography>
    <Typography>You can find the source code for the App
      on <NewWindowLink href={cognitoPocGithubUrl}>Github</NewWindowLink>.
    </Typography>
  </SmallContentMain>
}

function getCognitoGoogleLoginDomain(config: CognitoConfig){
  return `https://${config.google.userPoolDomain}`+
    `.auth.${config.region}.amazoncognito.com`
}

export function GoogleSignInContainer({serverConfig}:{
  serverConfig: CognitoConfig
}){
  const [isWorking, setIsWorking] = React.useState(false);

  async function googleSignIn(){
    const redirectUri = serverLocationUrl();
    console.debug("redirect to:", redirectUri);
    const googleLoginUrl = getCognitoGoogleLoginDomain(serverConfig) +
      "/login?response_type=token" +
      `&client_id=${serverConfig.google.userPoolClientId}` +
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


