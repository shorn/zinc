import { CognitoConfig } from "shared";
import React from "react";
import { navBrowserByAssign } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { formatCognitoIdProviderRedirect } from "Auth/Authn";
import { ButtonContainer } from "Component/ButtonContainer";

export function SocialSignInContainer({cognito}: {
  cognito: CognitoConfig
}){
  const [isWorking, setIsWorking] = React.useState(false);

  async function googleSignIn(){
    let redirectUrl =
      formatCognitoIdProviderRedirect(cognito.google, cognito.region );
    setIsWorking(true);
    navBrowserByAssign(redirectUrl);
  }

  async function githubSignIn(){
    let redirectUrl =
      formatCognitoIdProviderRedirect(cognito.github, cognito.region );
    setIsWorking(true);
    navBrowserByAssign( redirectUrl);
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

