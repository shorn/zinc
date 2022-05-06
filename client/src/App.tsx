import React from 'react';
import './App.css';
import { CssBaseline } from "@mui/material";
import { ReactErrorBoundary } from "Error/ReactErrorBoundary";
import { ErrorDialogProvider } from "Error/ErrorDialog";
import { NavigationProvider } from "Design/NavigationProvider";
import { ZincTheme } from "Design/ZincTheme";
import { LocationPathnameProvider } from "Util/Hook/LocationPathname";
import { AppNavBar } from "Design/AppNavBar";
import { AuthProvider } from "Auth/AuthProvider";
import { MyDetailsPage } from 'Page/MyDetailsPage';
import { ListUserPage } from "Page/ListUserPage";
import { ServerInfoProvider } from "Api/ServerInfoProvider";
import { PostApiProvider } from "Api/PostApiProvider";
import { getPrivacyPagePath, PrivacyPage } from "Page/PrivacyPage";
import { getUsageTermsPagePath, UsageTermsPage } from "Page/UsageTermsPage";

export function App(){
  return <ZincTheme>
    {/* force browser defaults for consistent display behaviour */}
    <CssBaseline/>
    {/* deal with "unhandled" errors from bad rendering logic */}
    <ReactErrorBoundary>
      {/* deal with "handled" errors as a global, generic modal dialog  */}
      <ErrorDialogProvider>
        {/* manages window.location for routing */}
        <LocationPathnameProvider>
          {/* reads some important config from server */}
          <ServerInfoProvider>
            {/* authentication and authorisation */}
            <AuthProvider unauthenticatedPaths={[
              getPrivacyPagePath(), getUsageTermsPagePath()
            ]}>
              {/* convenient access to PostApi for making server calls */}
              <PostApiProvider>
                {/* transition animation and delegates to location infra */}
                <NavigationProvider>
                  {/* NavBar across the top of screen and sliding drawer */}
                  <AppNavBar/>
                  
                  {/* Navigable, authenticated pages, self-routed */}
                  <MyDetailsPage/>
                  <ListUserPage/>
                  
                </NavigationProvider>
              </PostApiProvider>
            </AuthProvider>
            
            {/* unauthenticated pages, self-routed */}
            <PrivacyPage/>
            <UsageTermsPage/>
            
          </ServerInfoProvider>
        </LocationPathnameProvider>
      </ErrorDialogProvider>
    </ReactErrorBoundary>
  </ZincTheme>
}


