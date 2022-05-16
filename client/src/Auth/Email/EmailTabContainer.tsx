import React, { Dispatch, SetStateAction } from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useServerInfo } from "Api/ServerInfoProvider";
import { SignInContainer } from "Auth/Email/SignInContainer";
import { ContainerCard } from "Design/ContainerCard";
import { SignUpContainer } from "Auth/Email/SignUpContainer";
import { ForgotPasswordContainer } from "Auth/Email/ForgotPasswordContainer";

export type EmailFieldState = [string, Dispatch<SetStateAction<string>>];

export function EmailTabContainer({onSignInSucceeded}: {
  onSignInSucceeded: () => void,
}){
  const {cognito} = useServerInfo();
  const [tabIndex, setTabIndex] = React.useState(0);
  const emailState = React.useState("") as EmailFieldState;
  
  // don't create every render (probably not expensive, but w/e)
  const pool = React.useMemo(() => {
    return new CognitoUserPool({
      UserPoolId: cognito.email.userPoolId,
      ClientId: cognito.email.userPoolClientId,
    });
  }, [cognito.email.userPoolId, cognito.email.userPoolClientId]);


  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return <div>
    <ContainerCard title={"Email"} contentPadding={"0"}>    
    <Tabs
      value={tabIndex}
      onChange={handleChange}
      variant="fullWidth"
      aria-label="full width tabs example"
    >
      <Tab label="Sign in" {...a11yProps(0)} />
      <Tab label="Sign up" {...a11yProps(1)} />
      <Tab label="Forgot password" {...a11yProps(2)} />
    </Tabs>
    <TabPanel value={tabIndex} index={0}>
      <SignInContainer pool={pool} emailState={emailState}
        onSignInSucceeded={onSignInSucceeded} />
    </TabPanel>
    <TabPanel value={tabIndex} index={1}>
      <SignUpContainer pool={pool} emailState={emailState} />
    </TabPanel>
    <TabPanel value={tabIndex} index={2}>
      <ForgotPasswordContainer pool={pool} emailState={emailState}  
        onConfirmed={()=>setTabIndex(0)}/>
    </TabPanel>
    </ContainerCard>
  </div>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps){
  const {children, value, index, ...other} = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{p: 3}}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number){
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
  };
}


