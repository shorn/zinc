import { SmallContentMain } from "Design/LayoutMain";
import { Typography } from "@mui/material";
import {
  zincGithubUrl,
  muiUrl,
  NewWindowLink
} from "Component/ExternalLinks";
import React from "react";

export function IntroContainer(){
  return <SmallContentMain center>
    <Typography paragraph>Zinc is demo app for learning about AWS Cognito.
      The UI is built using React and the <NewWindowLink href={muiUrl}>
        MUI</NewWindowLink> framework.
    </Typography>
    <Typography>You can find the source code for Zinc
      on <NewWindowLink href={zincGithubUrl}>Github</NewWindowLink>.
    </Typography>
  </SmallContentMain>
}