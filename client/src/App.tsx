import React from 'react';
import './App.css';
import { CssBaseline } from "@mui/material";
import { ReactErrorBoundary } from "Error/ReactErrorBoundary";
import { ErrorDialogProvider } from "Error/ErrorDialog";
import { NavigationProvider } from "Design/NavigationProvider";
import { PocTheme } from "Design/PocTheme";
import { LocationPathnameProvider } from "Util/Hook/LocationPathname";
import { AppNavBar } from "Design/AppNavBar";
import { AuthProvider } from "Auth/AuthProvider";
import { PostApiProvider } from "Auth/PostApiProvider";
import { MyDetailsPage } from 'Page/MyDetailsPage';
import { ListUserPage } from "Page/ListUserPage";
import { ServerInfoProvider } from "Auth/ServerInfoProvider";

export function App(){
  return <PocTheme>
    <CssBaseline/>
    <ReactErrorBoundary>
      <ErrorDialogProvider>
        {/* manages window.location for routing */}
        <LocationPathnameProvider>
          {/* reads some important config from server */}
          <ServerInfoProvider>
            {/* authentication and authorisation */}
            <AuthProvider>
              {/* convenient access to PostApi for making server calls */}
              <PostApiProvider>
                {/* navigation transitions and delgates to location infra */}
                <NavigationProvider>
                  {/* NavBar across the top of screen and sliding drawer */}
                  <AppNavBar/>
                  
                  {/* all pages in the app */}
                  <MyDetailsPage/>
                  <ListUserPage/>
                  
                </NavigationProvider>
              </PostApiProvider>
            </AuthProvider>
          </ServerInfoProvider>
        </LocationPathnameProvider>
      </ErrorDialogProvider>
    </ReactErrorBoundary>
  </PocTheme>
}


