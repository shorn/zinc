import { NavTransition } from "Design/NavigationProvider";
import React from "react";
import { ContainerCard } from "Design/ContainerCard";
import { SmallContentMain } from "Design/LayoutMain";
import { Stack, TextField } from "@mui/material";

const log = console;

const pageUrl = "/my-details";

export function getHomePageLink(): string{
  return pageUrl;
}

export function isHomePagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(pageUrl) || path === "/";
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


