import { NavTransition } from "Design/NavigationProvider";
import React from "react";
import { ContainerCard } from "Design/ContainerCard";
import { FlexContentMain } from "Design/LayoutMain";
import { TextSpan } from "../Component/TextSpan";

const log = console;

const scratchUrl = "/scratch";

export function getScratchPageLink(): string{
  return scratchUrl;
}

export function isScratchPagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(scratchUrl);
}

export function ScratchPage(){
  return <NavTransition isPath={isScratchPagePath} title={"POC - scratch"}>
    <Content/>
  </NavTransition>
}

function Content(){
  return <FlexContentMain>
    <ContainerCard title={"Scratch"}>
      <TextSpan>Nothing here yet</TextSpan> 
    </ContainerCard>
  </FlexContentMain>
}


