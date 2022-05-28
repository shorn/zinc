import React from "react";
import { navBrowserByAssign } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { formatCognitoIdProviderRedirect } from "Auth/Authn";
import { useServerInfo } from "Api/ServerInfoProvider";
import { TextSpan } from "Component/TextSpan";
import { NewWindowLink, zincGithubOidcDocUrl } from "Component/ExternalLinks";
import { useSignInContext } from "Auth/AuthProvider";
import { GitHub, Google } from "@mui/icons-material";
import { HelpPopover } from "Component/HelpPopover";

const googleSigninIn = "google-cognito-signing-in";
const githubSigningIn = "github-cognito-signing-in";

export function CognitoSocialSignInContainer(){
  const {cognito} = useServerInfo();
  const signInContext = useSignInContext();
  
  async function googleSignIn(){
    signInContext.setAction(googleSigninIn);
    try {
      let redirectUrl =
        formatCognitoIdProviderRedirect(cognito.google, cognito.region);
      navBrowserByAssign(redirectUrl);
    }
    catch( err ){
      signInContext.setAction(undefined);
      throw err;
    }
  }

  async function githubSignIn(){
    signInContext.setAction(githubSigningIn);
    try {
      let redirectUrl =
        formatCognitoIdProviderRedirect(cognito.github, cognito.region);
      navBrowserByAssign(redirectUrl);
    }
    catch( err ){
      signInContext.setAction(undefined);
      throw err;
    }
  }

  const disabled = !!signInContext.action;
  return <ContainerCard title={"Cognito Social Sign-in"}
    action={<CognitoHelp/>}
  >
    <div style={{
      display: "grid",
      gridTemplateColumns: "8em 8em",
      justifyContent: "center",
      columnGap: "1em", rowGap: "1em",
      // the textspan following was too cramped
      marginBottom: ".5em"
    }}>
      <PrimaryButton startIcon={<Google/>}
        isLoading={signInContext.action === googleSigninIn}
        disabled={disabled} onClick={googleSignIn}
      >
        Google
      </PrimaryButton>
      <PrimaryButton startIcon={<GitHub/>}
        isLoading={signInContext.action === githubSigningIn}
        disabled={disabled} onClick={githubSignIn}
      >
        Github
      </PrimaryButton>
    </div>
  </ContainerCard>
}

function CognitoHelp(){
  return <HelpPopover content={
    <TextSpan>
      Sign in to an ID Provider via Cognito.
      Zinc uses a <NewWindowLink href={zincGithubOidcDocUrl}>
      custom OIDC shim</NewWindowLink> to integrate Cognito with Github.
    </TextSpan>
  }/>;
}