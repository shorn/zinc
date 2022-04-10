import React from 'react';
import './App.css';
import { CssBaseline } from "@mui/material";
import { ReactErrorBoundary } from "Error/ReactErrorBoundary";
import { ErrorDialogProvider } from "Error/ErrorDialog";
import { NavigationProvider } from "Design/NavigationProvider";
import { PocTheme } from "Design/PocTheme";
import { HomePage } from "Page/HomePage";
import { ScratchPage } from "Page/ScratchPage";
import { LocationPathnameProvider } from "Util/Hook/LocationPathname";
import { AppNavBar } from "Design/AppNavBar";
import { AuthenticationProvider } from "Auth/AuthenticationProvider";
import { ApiProvider } from "Auth/ApiProvider";

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
                <HomePage/>
                <ScratchPage/>
              </NavigationProvider>
            </ApiProvider>
          </AuthenticationProvider>
        </LocationPathnameProvider>
      </ErrorDialogProvider>
    </ReactErrorBoundary>
  </PocTheme>
}


