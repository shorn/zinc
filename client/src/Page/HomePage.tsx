import {NavTransition} from "Design/NavigationProvider";
import React from "react";
import {CardMargin} from "Design/ContainerCard";
import {FlexContentMain} from "Design/LayoutMain";
import {TextSpan} from "../Component/TextSpan";

const log = console;

const helloUrl = "/hello";

export function getHomePageLink(): string{
  return helloUrl;
}

export function isHomePagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(helloUrl) || path === "/";
}

export function HomePage(){
  return <NavTransition isPath={isHomePagePath} title={"POC - hello world"}>
    <Content/>
  </NavTransition>
}

function Content(){
  return <FlexContentMain>
    <CardMargin><TextSpan>Hello, world.</TextSpan></CardMargin>
  </FlexContentMain>
}

