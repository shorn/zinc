import React from 'react';
import './App.css';
import {CssBaseline} from "@mui/material";
import {ReactErrorBoundary} from "Error/ReactErrorBoundary";
import {ErrorDialogProvider} from "Error/ErrorDialog";
import {NavigationProvider} from "Design/NavigationProvider";
import {PocTheme} from "Design/PocTheme";
import {HomePage} from "Page/HomePage";
import {ScratchPage} from "Page/ScratchPage";
import {LocationPathnameProvider} from "Util/Hook/LocationPathname";
import {AppNavBar} from "Design/AppNavBar";
import {AuthenticationProvider} from "Auth/AuthenticationProvider";

export function App(){
  return <PocTheme>
    <CssBaseline/>
    <ReactErrorBoundary>
      <ErrorDialogProvider>
        <LocationPathnameProvider>
          <AuthenticationProvider>
            <NavigationProvider>
              <AppNavBar/>
              <HomePage/>
              <ScratchPage/>
            </NavigationProvider>
          </AuthenticationProvider>
        </LocationPathnameProvider>
      </ErrorDialogProvider>
    </ReactErrorBoundary>
  </PocTheme>
}


