import { NavTransition } from "Design/NavigationProvider";
import React from "react";
import { ContainerCard } from "Design/ContainerCard";
import { LargeContentMain } from "Design/LayoutMain";
import { TextSpan } from "Component/TextSpan";
import { useAuthn } from "Auth/AuthenticationProvider";
import { api } from "Server/Api";
import { PublicUserData } from "shared/ApiTypes";
import { ErrorInfo } from "Error/ErrorUtil";
import { RefreshIconButton } from "Component/RefreshIconButton";
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
import { AlternatingTableRow } from "Component/Util";
import { formatShortIsoDateTime } from "Util/DateUtil";

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

type State = {
  current: "init"
} | {
  current: "loading"
} | {
  current: "loaded"
} | {
  current: "error",
  error: ErrorInfo,
}

function Content(){
  const authn = useAuthn();
  const [users, setUsers] = React.useState<PublicUserData[] | undefined>(
    undefined);
  const [state, setState] = React.useState<State>({current: "init"});

  const listUsers = React.useCallback(async () => {
    setState({current: "loading"});
    try {
      const result = await api.listUsers.post({}, authn.session.accessToken);
      console.log("listUsers", result);
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

  }, [authn]);

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
      {state.current === "error" &&
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
                <TextSpan>{row.userId}</TextSpan>
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

function UserCreatedText({user}: {user: PublicUserData}){
  return <TextSpan>
    { !!user.userCreated &&
      formatShortIsoDateTime(user.userCreated)
    }
    { !user.userCreated &&
      ""
    }
  </TextSpan>
}
