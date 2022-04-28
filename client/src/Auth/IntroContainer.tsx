import { SmallContentMain } from "Design/LayoutMain";
import { Typography } from "@mui/material";
import {
  cognitoPocGithubUrl,
  muiUrl,
  NewWindowLink
} from "Component/ExternalLinks";
import React from "react";

export function IntroContainer(){
  return <SmallContentMain center>
    <Typography paragraph>This is is a demo app built to learn about
      AWS Cognito.
      The UI is built using React and the <NewWindowLink href={muiUrl}>
        MUI</NewWindowLink> framework.
    </Typography>
    <Typography>You can find the source code for the App
      on <NewWindowLink href={cognitoPocGithubUrl}>Github</NewWindowLink>.
    </Typography>
  </SmallContentMain>
}