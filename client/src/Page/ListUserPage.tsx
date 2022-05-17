import { NavTransition } from "Design/NavigationProvider";
import React from "react";
import { ContainerCard } from "Design/ContainerCard";
import { TextSpan } from "Component/TextSpan";
import { LargeContentMain } from "Design/LayoutMain";
import { CompactErrorPanel } from "Error/CompactErrorPanel";
import {
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { formatLocalDateAsIsoShortDateTime } from "Util/DateUtil";
import { PublicUserData } from "Shared/ApiTypes";
import { RefreshIconButton } from "Component/RefreshIconButton";
import { AlternatingTableRow } from "Component/Util";
import { ErrorInfo } from "Error/ErrorUtil";
import { usePostApi } from "Api/PostApiProvider";

const log = console;

const pageUrl = "/list-user";

export function getListUserPageLink(): string{
  return pageUrl;
}

export function isListUserPagePath(path: String): boolean{
  const normalizedPath = path.toLowerCase();
  return normalizedPath.startsWith(pageUrl);
}

export function ListUserPage(){
  return <NavTransition isPath={isListUserPagePath} title={"Zinc - list users"}>
    <Content/>
  </NavTransition>
}

type ProviderState = 
  {current: "init"} | 
  {current: "loading"} | 
  {current: "loaded"} | 
  {current: "error", error: ErrorInfo};

function Content(){
  const api = usePostApi();
  const [users, setUsers] = React.useState(
    undefined as PublicUserData[] | undefined );
  const [state, setState] = React.useState<ProviderState>({current: "init"});

  const listUsers = React.useCallback(async () => {
    setState({current: "loading"});
    try {
      const result = await api.listUser({});
      setUsers(result);
      setState({current: "loaded"});
    }
    catch( e ){
      setState({
        current: "error", error: {
          message: "while loading users", problem: e
        }
      });
    }

  }, [api]);

  React.useEffect(() => {
    //noinspection JSIgnoredPromiseFromCall
    listUsers();
  }, [listUsers]);

  const tableColumns = 2;
  return <LargeContentMain>
    <ContainerCard title={"Users"}
      action={<RefreshIconButton refreshing={state.current === "loading"}
        onClick={listUsers}
      />}
    >
      { state.current === "error" &&
        <CompactErrorPanel error={state.error}/>
      }
      <TableContainer><Table>
        <TableHead><TableRow>
          <TableCell><strong>User</strong></TableCell>
          <TableCell><strong>Created</strong></TableCell>
        </TableRow></TableHead>
        <TableBody>
          { users === undefined && state.current === "loading" && <>
            <TableRow><TableCell colSpan={tableColumns} align="center">
              <LinearProgress style={{height: 2}}/>
            </TableCell></TableRow>
          </>}
          { users !== undefined && users.length < 1 && <>
            <TableRow><TableCell colSpan={tableColumns} align="center">
              <TextSpan>No users found</TextSpan>
            </TableCell></TableRow>
          </>}
          { users?.map((row) => (
            <AlternatingTableRow key={row.userId}>
              <TableCell>
                <UserDisplayName displayName={row.displayName}/>
              </TableCell>
              <TableCell>
                <UserCreatedText user={row}/>
              </TableCell>
            </AlternatingTableRow>
          ))}
        </TableBody>
      </Table></TableContainer>
    </ContainerCard>

  </LargeContentMain>
}

function UserDisplayName({displayName}: {displayName: string|undefined}){
  return <TextSpan>
    { displayName || "anonymous"}
  </TextSpan>
}

function UserCreatedText({user}: {user: PublicUserData}){
  return <TextSpan>
    { formatLocalDateAsIsoShortDateTime(user.userCreated) || "" }
  </TextSpan>
}
