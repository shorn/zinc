import { CognitoConfig } from "shared";
import React from "react";
import { navBrowserByAssign, serverLocationUrl } from "Util/WindowUtil";
import { ContainerCard } from "Design/ContainerCard";
import { PrimaryButton } from "Component/AppButton";
import { getCognitoGoogleSignInDomain } from "Auth/Authn";

export function GoogleSignInContainer({cognito}: {
  cognito: CognitoConfig
}){
  const [isWorking, setIsWorking] = React.useState(false);

  async function googleSignIn(){
    const redirectUri = serverLocationUrl();
    console.debug("redirect to:", redirectUri);
    const googleLoginUrl = getCognitoGoogleSignInDomain(cognito) +
      "/login?response_type=token" +
      `&client_id=${cognito.google.userPoolClientId}` +
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

