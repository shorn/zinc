import { SmallContentMain } from "Design/LayoutMain";
import { Typography } from "@mui/material";
import { NewWindowLink, zincGithubUrl } from "Component/ExternalLinks";
import React from "react";
import { getPrivacyPagePath } from "Page/PrivacyPage";
import { ZincLink } from "Component/ZincLink";
import { getUsageTermsPagePath } from "Page/UsageTermsPage";

export function IntroContainer(){
  return <SmallContentMain center>
    <Typography paragraph>Zinc is a demo app for learning about AWS Cognito.
    </Typography>
    <Typography paragraph>
      <ZincLink href={getPrivacyPagePath()}>Privacy statement</ZincLink>
      &emsp;
      &emsp;
      <ZincLink href={getUsageTermsPagePath()}>Usage terms</ZincLink>
    </Typography>
    <Typography>You can find the source code for Zinc
      on <NewWindowLink href={zincGithubUrl}>Github</NewWindowLink>.
    </Typography>
  </SmallContentMain>
}