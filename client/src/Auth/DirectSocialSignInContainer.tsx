import React from "react";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { ButtonContainer } from "Component/ButtonContainer";
import { useServerInfo } from "Api/ServerInfoProvider";
import { TextSpan } from "Component/TextSpan";
import {
  NewWindowLink,
  zincGithubDirectDocUrl,
  zincGithubOidcDocUrl
} from "Component/ExternalLinks";

export function DirectSocialSignInContainer(){
  const {directAuthn} = useServerInfo();
  
  const [isWorking, setIsWorking] = React.useState(false);

  async function githubSignIn(){
    let redirectUrl = `${directAuthn.githubIssuer}/authorize` +
      `?redirect_uri=${serverLocationUrl()}`; 
    setIsWorking(true);
    navBrowserByAssign( redirectUrl);
  }

  return <ContainerCard title={"Direct Social Sign-in"}>
    <ButtonContainer style={{
      justifyContent: "center",
      // the textspan following was too cramped
      marginBottom: ".5em"
    }}>
        <PrimaryButton isLoading={isWorking} disabled={isWorking}
          onClick={githubSignIn}
        >
          Github
        </PrimaryButton>
      </ButtonContainer>
    <TextSpan>
      Sign in <NewWindowLink href={zincGithubDirectDocUrl}>
      direct with the provider</NewWindowLink>, do not use Cognito at all.
    </TextSpan>
  </ContainerCard>
}

