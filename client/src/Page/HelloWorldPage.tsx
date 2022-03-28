import {NavTransition} from "Design/NavigationProvider";
import React from "react";
import {CardMargin} from "Design/ContainerCard";
import {FlexContentMain} from "Design/LayoutMain";
import {TextSpan} from "../Component/TextSpan";

const log = console;

const helloUrl = "/hello";

export function getHelloWorldPageLink(): string{
  return helloUrl;
}

export function isHelloWorldPagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(helloUrl) || path === "/";
}

export function HelloWorldPage(){
  return <NavTransition isPath={isHelloWorldPagePath} title={"POC - hello world"}>
    <Content/>
  </NavTransition>
}

function Content(){
  return <FlexContentMain>
    <CardMargin><TextSpan>Hello, world.</TextSpan></CardMargin>
  </FlexContentMain>
}

