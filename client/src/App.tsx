import React from 'react';
import './App.css';
import { CssBaseline } from "@mui/material";
import { ReactErrorBoundary } from "Error/ReactErrorBoundary";
import { ErrorDialogProvider } from "Error/ErrorDialog";
import { NavigationProvider } from "Design/NavigationProvider";
import { PocTheme } from "Design/PocTheme";
import { LocationPathnameProvider } from "Util/Hook/LocationPathname";
import { AppNavBar } from "Design/AppNavBar";
import { AuthenticationProvider } from "Auth/AuthenticationProvider";
import { ApiProvider } from "Auth/ApiProvider";
import { MyDetailsPage } from 'Page/MyDetailsPage';
import { ListUserPage } from "Page/ListUserPage";

export function App(){
  return <PocTheme>
    <CssBaseline/>
    <ReactErrorBoundary>
      <ErrorDialogProvider>
        <LocationPathnameProvider>
          <AuthenticationProvider>
            <ApiProvider>
              <NavigationProvider>
                <AppNavBar/>
                <MyDetailsPage/>
                <ListUserPage/>
              </NavigationProvider>
            </ApiProvider>
          </AuthenticationProvider>
        </LocationPathnameProvider>
      </ErrorDialogProvider>
    </ReactErrorBoundary>
  </PocTheme>
}


