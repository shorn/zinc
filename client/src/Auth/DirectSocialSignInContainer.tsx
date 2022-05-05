import React from "react";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { ButtonContainer } from "Component/ButtonContainer";
import { useServerInfo } from "Api/ServerInfoProvider";
import { TextSpan } from "Component/TextSpan";
import { NewWindowLink, zincGithubDirectDocUrl } from "Component/ExternalLinks";
import { ZincOauthState } from "shared";
import { encodeBase64 } from "Util/Encoding";

export function DirectSocialSignInContainer(){
  const serverInfo = useServerInfo();

  const [isWorking, setIsWorking] = React.useState(false);

  async function githubSignIn(){
    const githubAuthorizeUrl = "https://github.com/login/oauth/authorize";
    // this is not an OIDC sign-in, github uses `,` to separate scopes
    const scope = "read:user,user:email";
    const state: ZincOauthState = {
      redirectUri: serverLocationUrl()
    }
    let loginUrl = `${githubAuthorizeUrl}` +
      `?client_id=${serverInfo.directAuthn.github.clientId}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${encodeBase64(JSON.stringify(state))}`;
    setIsWorking(true);
    navBrowserByAssign(loginUrl);
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

