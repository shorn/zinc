import { NavTransition } from "Design/NavigationProvider";
import React from "react";
import { ContainerCard } from "Design/ContainerCard";
import {
  FlexContentMain,
  LargeContentMain,
  SmallContentMain
} from "Design/LayoutMain";
import { TextSpan } from "Component/TextSpan";
import { Stack, TextField } from "@mui/material";

const log = console;

const helloUrl = "/my-details";

export function getHomePageLink(): string{
  return helloUrl;
}

export function isHomePagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(helloUrl) || path === "/";
}

export function MyDetailsPage(){
  return <NavTransition isPath={isHomePagePath} title={"POC - My details"}>
    <Content/>
  </NavTransition>
}

function Content(){
  const [displayName, setDisplayName] = React.useState("");
  
  const isWorking = false;
  return <SmallContentMain>
    <ContainerCard title={"My details"}>
      <form onSubmit={(e) => {
        e.preventDefault();
        // noinspection JSIgnoredPromiseFromCall
        //emailSignIn(email, password);
      }}>
        <Stack spacing={1}>
          <TextField id="displayName" label="Display name" type="text" fullWidth
            disabled={isWorking}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
            }}
          />
        </Stack>
      </form>
        
    </ContainerCard>
  </SmallContentMain>
}


