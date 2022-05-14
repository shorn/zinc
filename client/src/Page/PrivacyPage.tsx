import React from "react";
import { normalisePath } from "Util/Location";
import { useLocationPathname } from "Util/Hook/LocationPathname";
import { SmallContentMain } from "Design/LayoutMain";
import { List, ListItemText, Typography } from "@mui/material";

const log = console;

const pageUrl = "/privacy";

export function getPrivacyPagePath(): string{
  return pageUrl;
}

export function isPrivacyPagePath(path: string): boolean{
  return normalisePath(path).startsWith(pageUrl);
}

export function PrivacyPage(){
  const {pathname} = useLocationPathname();
  if( !isPrivacyPagePath(pathname) ){
    return null;
  }
  window.document.title = "Zinc - Privacy";  
  return <Content/>;
}

function Content(){
  return <SmallContentMain>
    <Typography paragraph>
      Zinc is just a demonstration app.
    </Typography>
    <List >
      <ListItemText>All data collected (Account details such as email) is only 
        collected to show that the code works.</ListItemText>
      <ListItemText>No data is sent or sold to any third party other than AWS.
      </ListItemText>
      <ListItemText>When the Zinc example infrastructure is shutdown, all data 
        will be deleted.
      </ListItemText>
      <ListItemText>You can request that your own data be deleted by submitting 
        a request as an issue or discussion via Github.
        All data associated with your account (especially anything from ID 
        providers like Google or Facebook) will be deleted within 7 days.
      </ListItemText>
    </List>
    <Typography paragraph>
      Contact me via Gihub issue/discussion if you have any concerns.
    </Typography>
  </SmallContentMain>
}
