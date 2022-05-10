import React from "react";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { ButtonContainer } from "Component/ButtonContainer";
import { useServerInfo } from "Api/ServerInfoProvider";
import { TextSpan } from "Component/TextSpan";
import { NewWindowLink, zincGithubDirectDocUrl } from "Component/ExternalLinks";
import { ZincOAuthState } from "Shared/ApiTypes";
import { encodeBase64 } from "Util/Encoding";

export function DirectSocialSignInContainer(){
  const serverInfo = useServerInfo();

  const [isWorking, setIsWorking] = React.useState(false);

  async function githubSignIn(){
    const githubAuthorizeUrl = "https://github.com/login/oauth/authorize";
    // this is not an OIDC sign-in, github uses `,` to separate scopes
    const scope = "read:user,user:email";
    const state: ZincOAuthState = {
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

  async function googleSignIn(){
    const googleAuthorizeUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const scope = "openid email";
    const state: ZincOAuthState = {
      // this redirectUril is about the lambda redirect back our client
      redirectUri: serverLocationUrl()
    }
    let loginUrl = `${googleAuthorizeUrl}` +
      `?client_id=${serverInfo.directAuthn.google.clientId}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      /* this redirect_uri is about google redirecting to the lambda for hte 
      "authorization code grant" flow, beore it issues the id_token */
      `&redirect_uri=${serverInfo.directAuthn.google.issuer}/idpresponse` +
      `&state=${encodeBase64(JSON.stringify(state))}`;
    setIsWorking(true);
    navBrowserByAssign(loginUrl);
  }

  //const importedVal = sharedString;
  //console.log("imported", importedVal);
  
  return <ContainerCard title={"Direct Social Sign-in"}>
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
      Sign in directly to the ID Provider,{" "}
      <NewWindowLink href={zincGithubDirectDocUrl}>without using Cognito
      </NewWindowLink>.
    </TextSpan>
  </ContainerCard>
}

