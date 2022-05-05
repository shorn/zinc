import React from "react";
import { navBrowserByAssign } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { formatCognitoIdProviderRedirect } from "Auth/Authn";
import { ButtonContainer } from "Component/ButtonContainer";
import { useServerInfo } from "Api/ServerInfoProvider";
import { TextSpan } from "Component/TextSpan";
import { NewWindowLink, zincGithubOidcDocUrl } from "Component/ExternalLinks";

export function CognitoSocialSignInContainer(){
  const {cognito} = useServerInfo();
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

  return <ContainerCard title={"Cognito Social Sign-in"}>
      <ButtonContainer style={{
        justifyContent: "center",
        // the textspan following was too cramped
        marginBottom: ".5em"
      }}>
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
    <TextSpan>
      Sign in to an ID Provider via Cognito.
      Zinc uses a <NewWindowLink href={zincGithubOidcDocUrl}>
      custom OIDC shim</NewWindowLink> to integrate Cognito with Github.
    </TextSpan>
  </ContainerCard>
}

