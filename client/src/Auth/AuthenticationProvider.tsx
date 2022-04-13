import React, { useContext } from "react";
import { LargeContentMain, SmallContentMain } from "Design/LayoutMain";
import { Typography } from "@mui/material";
import {
  cognitoPocGithubUrl,
  muiUrl,
  NewWindowLink
} from "Component/ExternalLinks";
import {
  CognitoUserPool,
  CognitoUserSession
} from "amazon-cognito-identity-js";
import { SmallPageSpinner } from "Component/SmallPageSpinner";
import { ErrorInfoComponent } from "Error/ErrorInforComponent";
import { ErrorInfo } from "Error/ErrorUtil";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton, SecondaryButton } from "Component/AppButton";
import { TextSpan } from "Component/TextSpan";
import { parseJwtDate, parseServerDate } from "Util/DateUtil";
import { api, CognitoConfig } from "Server/Api";
import jwtDecode from "jwt-decode";
import { AuthzTokenPayload } from "shared";

//export const emailPool = new CognitoUserPool({
//  UserPoolId: Config.cognito.email.userPoolId,
//  ClientId: Config.cognito.email.userPoolClientId,
//});

/*
UserPool without IdentityPool cannot do auto-refresh
https://github.com/aws-amplify/amplify-js/issues/3619#issuecomment-510654531
 */
//export const googlePool = new CognitoUserPool({
//  UserPoolId: Config.cognito.google.userPoolId,
//  ClientId: Config.cognito.google.userPoolClientId,
//});

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
  // in-progress
  { status: "init" } |
  { status: "reading-config" } |
  { status: "getting-session" } |
  { status: "authorizing" } |
  { status: "signing-out" } |
  
  // terminal states
  { status: "not-signed-in" } |
  { status: "error", error: ErrorInfo } |
  { status: "unverified-email", email: string } |
  { status: "signed-in", authSession: AuthorizedSession } 
; 

function debugSession(session: CognitoUserSession){
  const idToken = session.getIdToken();
  const payload = idToken.payload;
  console.log(idToken.getJwtToken());
  console.debug("idToken", {
    exp: parseJwtDate(payload.exp),
    iat: parseJwtDate(payload.iat),
    auth_time: parseJwtDate(payload.auth_time),
  })
}


async function resolveGoogleAuthn(
  serverConfig: CognitoConfig,
  resolve: (value: AuthnState) => void,  
): Promise<void>{
  const pool = new CognitoUserPool({
    UserPoolId: serverConfig.google.userPoolId,
    ClientId: serverConfig.google.userPoolClientId,
  });

  const user = pool.getCurrentUser();
  console.debug("resolveGoogleAuthn()", user);

  const parsedHash = new URLSearchParams(
    window.location.hash.substring(1) // skip the first char (#)
  );

  const IdToken = parsedHash.get("id_token");
  // console.log("id_token", IdToken);
  if( !IdToken ){
    console.log("no IdToken", window.location.hash);
    resolve({status: "not-signed-in"});
    return;

  }
  //const AccessToken = parsedHash.get("access_token");
  //if( !AccessToken ){
  //  console.log("no AccessToken", window.location.hash);
  //  resolve({status: "not-logged-in"});
  //  return;
  //}
  //
  //const session = new CognitoUserSession({
  //  IdToken: new CognitoIdToken({IdToken}),
  //  AccessToken: new CognitoAccessToken({AccessToken})
  //})
  //
  // don't leave tokens in the url
  window.location.hash = "";

  resolve({status: "authorizing"});
  
  //const authzResponse = await authorize(IdToken);
  //const authzResponse = await post({
  //  type: "Authorize2", 
  //  payload: {idToken: IdToken} });
  const authzResponse = await api.authorize.post({
      idToken: IdToken, 
  });
  console.log("authzResponse", authzResponse);
  
  if( !authzResponse.succeeded ){
    resolve({
      status: "error",
      error: {
        message: authzResponse.message, 
        problem: authzResponse
      }
    });
    return;
  }

  const parseResult = parseAccessToken(authzResponse.accessToken);
  if( !parseResult.succeeded ){
    resolve({status: "error", error: {
      message: parseResult.message, 
        problem: parseResult.decoded }});
    return;
  }

  localStorage.setItem(accessTokenStorageKey, authzResponse.accessToken);
  
  resolve({ status: "signed-in", 
    authSession: {
      accessToken: authzResponse.accessToken,
      accessTokenExpiry: parseResult.accessTokenExpiry,
      payload: parseResult.payload,
    }
  });
}

export function parseAccessToken(accessToken: string):{
  succeeded: true,
  accessTokenExpiry: Date,
  payload: AuthzTokenPayload,
} | {
  succeeded: false,
  message: string,
  decoded: string|undefined,
}{
  const decoded: any = jwtDecode(accessToken);
  console.log("decoded", decoded);

  if( !decoded ){
    return {succeeded: false, message: "accessToken decode issue", decoded};
  }

  if( typeof decoded !== "object" ){
    return {succeeded: false, message: "decoded token is not object", decoded};
  }

  if( !decoded.userId || typeof(decoded.userId) !== "string" ){
    return {succeeded: false, message: "no accessToken payload userId", decoded};
  }

  if( !decoded.email  || typeof(decoded.email) !== "string" ){
    return {succeeded: false, message: "no accessToken payload email", decoded};
  }

  if( !decoded.role  || typeof(decoded.role) !== "string" ){
    return {succeeded: false, message: "no accessToken payload role", decoded};
  }

  if( !decoded.userCreated  || typeof(decoded.userCreated) !== "string" ){
    return {succeeded: false, message: "no accessToken payload userCreated", decoded};
  }
  
  if( !decoded.exp || typeof(decoded.exp) !== "number" ){
    return {succeeded: false, message: "malformed accessToken payload exp", decoded};
  }

  const accessTokenExpiry: Date|undefined = parseJwtDate(decoded.exp);
  if( !accessTokenExpiry ){
    return {succeeded: false, message: "malformed accessToken payload exp", decoded};
  }
  
  if( accessTokenExpiry <= new Date() ){
    console.warn("accessTokenExpiry", accessTokenExpiry);
    return {succeeded: false, message: "accessToken is expired", decoded};
  }
  
  return {
    succeeded: true,
    accessTokenExpiry,
    payload: {
      ...decoded,
      /* date needs to be converted since it was decoded from a JWT, not passed
      through our API parsing routine. */
      userCreated: parseServerDate(decoded.userCreated)
    },
  }
}

export async function resolveSignOutFromAll({serverConfig}: {
  serverConfig: CognitoConfig,
}): Promise<void>{
  const emailPool: CognitoUserPool|undefined = undefined;
  const googlePool = new CognitoUserPool({
    UserPoolId: serverConfig.google.userPoolId,
    ClientId: serverConfig.google.userPoolClientId,
  });

  return new Promise((resolve, reject) =>{
    console.log("signing out from all");
    //if( emailPool?.getCurrentUser() ){
    //  console.log("signing out email");
    //  emailPool.getCurrentUser()?.signOut(()=>{
    //    console.log("signed out from email")
    //    return resolve();
    //  });
    //}
    //else
      
    if( googlePool.getCurrentUser() ){
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

//let globalGooglePool: CognitoUserPool|undefined;

const accessTokenStorageKey = "cognitoPocAccessToken";

export function AuthenticationProvider({children}: {children: React.ReactNode}){
  const [state, setState] = React.useState<AuthnState>({status:"init"});
  const [serverConfig, setServerConfig] = React.useState<CognitoConfig|undefined>(undefined);
  
  const checkLoginState = React.useCallback( async () => {
    setState({status: "reading-config"});
    const serverInfo = await api.readConfig.post();
    console.log("serverInfo", serverInfo);
    //export const emailPool = new CognitoUserPool({
    //  UserPoolId: serverConfig.email.userPoolId,
    //  ClientId: serverConfig.email.userPoolClientId,
    //});

    /*
    https://cog-poc-google2.auth.us-east-1.amazoncognito.com/login?response_type=token&client_id=7bjopbg1nl44qgsgqa89almsrv&redirect_uri=http://localhost:9090
     */
    setServerConfig(serverInfo.cognito);

    const storedAccessToken = localStorage.getItem(accessTokenStorageKey);
    if( storedAccessToken ){
      const parseResult = parseAccessToken(storedAccessToken);
      if( parseResult.succeeded ){
        setState({
          status: "signed-in", authSession: {
            accessToken: storedAccessToken,
            accessTokenExpiry: parseResult.accessTokenExpiry,
            payload: parseResult.payload
          }
        });
        return;
      }
      else {
        console.warn("problem parsing accessToken from storage, ignoring",
          parseResult.message, parseResult.decoded);
      }
    }
    
    setState({status: "getting-session"});
    try {
      //const emailUser = emailPool.getCurrentUser();
      //const googleUser = googlePool.getCurrentUser();
      //console.log("checkLoginState() email,google", emailUser, googleUser);
      //if( emailUser ){
      //  console.log("resolving email authn");
      //  const emailState = await resolveEmailSession(emailPool);
      //  setState(emailState);
      //  if( emailState.status !== "not-logged-in" ){
      //    // don't fire the google check
      //    return;
      //  }
      //}

      console.log("resolving google authn");
      try {
        await resolveGoogleAuthn(serverInfo.cognito, setState);
      } catch( e ){
        setState({status: "error", error: {
            message: "while resolving google auth",
            problem: e
          }});
      }
      
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
    if( !serverConfig ){
      setState({
        status: "error", error: {
          message: "serverConfig should be set by now",
          problem: serverConfig
        }
      })
      return;
    }
    
    localStorage.removeItem(accessTokenStorageKey);
    
    await resolveSignOutFromAll({serverConfig});
    // this should result in "not-logged-in" state
    await checkLoginState();
    console.log("signOut() checkLogingState done");
  }, [checkLoginState, serverConfig]);
  
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

  if( state.status === "reading-config" ){
    return <SmallPageSpinner message={"Reading config"}/>
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
        {/*<EmailContainer pool={emailPool}*/}
        {/*  onSignInSucceeded={() => {*/}
        {/*    // noinspection JSIgnoredPromiseFromCall*/}
        {/*    checkLoginState();*/}
        {/*  }}*/}
        {/*/>*/}
        <br/>
        <GoogleSignInContainer serverConfig={serverConfig}/>
        
      </SmallContentMain>
    </LargeContentMain>
  }
  
  if( state.status === "authorizing" ){
    return <SmallPageSpinner message={"Authorizing"}/>
  }
  
  //if( !state.session.getIdToken() ){
  //  return <ErrorInfoComponent error={{
  //    message: "session has no IdToken", 
  //    problem: state.session
  //  }}/>
  //}
  //
  //if( !state.session.getIdToken().payload ){
  //  return <ErrorInfoComponent error={{
  //    message: "IdToken has no payload", 
  //    problem: state.session
  //  }}/>
  //}
  //
  //debugSession(state.session);
  
  return <AuthenticationContext.Provider value={{
    signOut: signOut,
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

export function GoogleSignInContainer({serverConfig}:{serverConfig: CognitoConfig}){
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


