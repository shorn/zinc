import { CognitoConfig } from "shared";
import React from "react";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import {
  getCognitoUserPoolUrl
} from "Auth/Authn";
import { ButtonContainer } from "Component/ButtonContainer";

export function SocialSignInContainer({cognito}: {
  cognito: CognitoConfig
}){
  const [isWorking, setIsWorking] = React.useState(false);

  async function googleSignIn(){
    const redirectUri = serverLocationUrl();
    const poolUrl = getCognitoUserPoolUrl(
      cognito.google.userPoolDomain, cognito.region );
    const googleLoginUrl = `${poolUrl}/login?response_type=token` +
      `&client_id=${cognito.google.userPoolClientId}` +
      `&redirect_uri=${redirectUri}`
    setIsWorking(true);
    navBrowserByAssign(googleLoginUrl);
  }

  async function githubSignIn(){
    const redirectUri = serverLocationUrl();
    const githubUserPoolDomain = "zinc-github-au";
    const githubUserPoolClientId = "14ev3n887ugitcidgiv9pb44ma";

    const poolUrl = getCognitoUserPoolUrl(
      githubUserPoolDomain, cognito.region );
    const gitHubLoginUrl = `${poolUrl}/login?response_type=token` +
      `&client_id=${githubUserPoolClientId}` +
      `&redirect_uri=${redirectUri}`
    setIsWorking(true);
    navBrowserByAssign(gitHubLoginUrl);
  }

  return <ContainerCard title={"Social Sign-in"}>
      <ButtonContainer style={{justifyContent: "center"}}>
        <PrimaryButton isLoading={isWorking} disabled={isWorking}
          onClick={googleSignIn}
        >
          Google
        </PrimaryButton>
        <PrimaryButton isLoading={isWorking} disabled={isWorking}
          onClick={githubSignIn}
        >
          Github
        </PrimaryButton>
        
      </ButtonContainer>
  </ContainerCard>
}

