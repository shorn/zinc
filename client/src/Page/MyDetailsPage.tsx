import { NavTransition } from "Design/NavigationProvider";
import React from "react";
import { ContainerCard } from "Design/ContainerCard";
import { SmallContentMain } from "Design/LayoutMain";
import { Stack, TextField } from "@mui/material";
import { ErrorInfo } from "Error/ErrorUtil";
import { PrivateUserData } from "shared";
import { usePostApi } from "Api/PostApiProvider";
import { useAuth } from "Auth/AuthProvider";
import { ButtonContainer } from "Component/ButtonContainer";
import { PrimaryButton } from "Component/AppButton";

const log = console;

const pageUrl = "/my-details";

export function getMyDetailsPageLink(): string{
  return pageUrl;
}

export function isMyDetailsPagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(pageUrl) ||
    // use this page as the "default" or "home" page for the app  
    path === "/";
}

export function MyDetailsPage(){
  return <NavTransition isPath={isMyDetailsPagePath} title={"POC - My details"}>
    <Content/>
  </NavTransition>
}

type PageState = 
  {current: "loading-details"} |
  {current: "updating-details"} |
  {current: "editing"} |
  {current: "error", error: ErrorInfo};

function Content(){
  const {userId} = useAuth().session.payload;
  const api = usePostApi();
  const [state, setState] = React.useState<PageState>(
    {current: "loading-details"} );
  const [details, setDetails] = React.useState(
    undefined as undefined | PrivateUserData);
  const [displayName, setDisplayName] = React.useState("");

  const loadDetails = React.useCallback( async () => {
    setState({current: "loading-details"});
    try {
      const result = await api.readUser({userId});
      setState({current: "editing"});
      setDetails(result);
      setDisplayName(result.displayName ?? "");
    }
    catch( err ){
      setState({
        current: "error", error: {
          message: "There was a problem while loading the details.",
          problem: err
        }
      });
      return;
    }
  }, [api, userId]);

  const updateDetails = React.useCallback( async () => {
    if( !details ){
      throw new Error("cannot update details if not read");
    }
    setState({current: "updating-details"});
    try {
      const result = await api.updateUser({
        ...details,
        displayName: displayName,
      });
      setState({current: "editing"});
      setDetails(result);
      setDisplayName(result.displayName ?? "");
    }
    catch( err ){
      setState({
        current: "error", error: {
          message: "There was a problem while updating the details.",
          problem: err
        }
      });
      return;
    }
  }, [api, details, displayName]);

  React.useEffect(() => {
    //   noinspection JSIgnoredPromiseFromCall
    loadDetails();
  }, [loadDetails]);
  
  
  const isWorking = state.current === "loading-details" || 
    state.current === "updating-details";
  
  return <SmallContentMain>
    <ContainerCard title={"My details"}>
      <form onSubmit={(e) => {
        e.preventDefault();
        //noinspection JSIgnoredPromiseFromCall
        updateDetails();
      }}>
        <Stack spacing={1}>
          <TextField id="displayName" label="Display name" type="text" fullWidth
            disabled={isWorking}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
            }}
          />
          <ButtonContainer>
            <PrimaryButton type={"submit"}
              disabled={isWorking}
              isLoading={isWorking}
            >
              Update
            </PrimaryButton>
          </ButtonContainer>
        </Stack>
      </form>
        
    </ContainerCard>
  </SmallContentMain>
}


