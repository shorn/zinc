import React from 'react';
import './App.css';
import {CssBaseline} from "@mui/material";
import {ReactErrorBoundary} from "Error/ReactErrorBoundary";
import {ErrorDialogProvider} from "Error/ErrorDialog";
import {NavigationProvider} from "Design/NavigationProvider";
import {PocTheme} from "Design/PocTheme";
import {HelloWorldPage} from "Page/HelloWorldPage";
import {ScratchPage} from "Page/ScratchPage";
import {LocationPathnameProvider} from "Util/Hook/LocationPathname";
import {AppNavBar} from "Design/AppNavBar";
import {LoginPage} from "Page/LoginPage";

export function App() {
  return <PocTheme>
    <CssBaseline/>
    <ReactErrorBoundary>
      <ErrorDialogProvider>
        <LocationPathnameProvider>
          {/* authn provide goes here*/}
          <NavigationProvider>
            <AppNavBar/>
            <HelloWorldPage/>
            <ScratchPage/>
            <LoginPage/>
          </NavigationProvider>
        </LocationPathnameProvider>
      </ErrorDialogProvider>
    </ReactErrorBoundary>
  </PocTheme>
}


