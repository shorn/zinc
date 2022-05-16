import React from "react";
import { navBrowserByAssign } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { formatCognitoIdProviderRedirect } from "Auth/Authn";
import { ButtonContainer } from "Component/ButtonContainer";
import { useServerInfo } from "Api/ServerInfoProvider";
import { TextSpan } from "Component/TextSpan";
import { NewWindowLink, zincGithubOidcDocUrl } from "Component/ExternalLinks";
import { useSignInContext } from "Auth/AuthProvider";

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
  return <ContainerCard title={"Cognito Social Sign-in"}>
      <ButtonContainer style={{
        justifyContent: "center",
        // the textspan following was too cramped
        marginBottom: ".5em"
      }}>
        <PrimaryButton isLoading={signInContext.action === googleSigninIn} 
          disabled={disabled} onClick={googleSignIn}
        >
          Google
        </PrimaryButton>
        <PrimaryButton isLoading={signInContext.action === githubSigningIn} 
          disabled={disabled} onClick={githubSignIn}
        >
          Github
        </PrimaryButton>
      </ButtonContainer>
    <TextSpan>
      Sign in to an ID Provider via Cognito.
      Zinc uses a <NewWindowLink href={zincGithubOidcDocUrl}>
      custom OIDC shim</NewWindowLink> to integrate Cognito with Github.
    </TextSpan>
  </ContainerCard>
}

