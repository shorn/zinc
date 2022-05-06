import React from "react";
import { normalisePath } from "Util/Location";
import { useLocationPathname } from "Util/Hook/LocationPathname";
import { SmallContentMain } from "Design/LayoutMain";
import { List, ListItemText } from "@mui/material";

const log = console;

const pageUrl = "/terms";

export function getUsageTermsPagePath(): string{
  return pageUrl;
}

export function isUsageTermsPagePath(path: string): boolean{
  return normalisePath(path).startsWith(pageUrl);
}

export function UsageTermsPage(){
  const {pathname} = useLocationPathname();
  if( !isUsageTermsPagePath(pathname) ){
    return null;
  }
  window.document.title = "Zinc - Usage terms";  
  return <Content/>;
}

function Content(){
  return <SmallContentMain>
    <List >
      <ListItemText>Zinc runs on AWS infrastructure in a sub-account that I pay 
        for, so please don't abuse it.
      </ListItemText>
      <ListItemText>Don't use it to obtain data on other users.
      </ListItemText>
      <ListItemText>You can link to it to publish your own blog articles or 
      examples, but I make no promises that I will keep it running.
      </ListItemText>
    </List>
  </SmallContentMain>
}
