import React from 'react';
import './index.css';
import * as serviceWorker from './serviceWorker';
import { App } from "App";
import { authApi } from "Api/AuthApi";
import { ServerInfo } from "Shared/ApiTypes";
import { createRoot } from "react-dom/client";


/* load this as early as possible to trigger lambda cold start. */
export const serverConfigRequest: Promise<ServerInfo> = authApi.readConfig();
(async ()=> await serverConfigRequest)();

const container = document.getElementById('root');
if( !container ){
  throw new Error("could not find the root div to attach React");
}

const root = createRoot(container);
root.render(<App/>);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();



/**
 * The "persisted load" scenario was observed when the user hit the back button
 * after we had navigated them to the Cognito (or any other IdP) page.
 * The browser (Chrome, Safari, Firefox) may load the App from the
 * "back forward cache", which restores in-memory state (and thus, context,
 * etc.) This resulted in the SignInContext state still being set to disable
 * all the SSO buttons and show loading spinner on the button pressed.
 * <p>
 * The specific SignInContext state issue could possibly be fixed by un-setting
 * the context on the page unload event or re-setting the individual state here.
 * But I don't like that plan - I prefer the nuclear option.  This way the
 * problem is solved for all functionality globally. 
 * <p>
 * Note that there is no specific way to disable the bfcache and it doesn't
 * look like there will be: https://github.com/whatwg/html/issues/5744
 */
window.addEventListener('pageshow', (ev: PageTransitionEvent) => {
  //console.log("pageshow event", ev);
  if( ev.persisted ){
    console.log("location.reload() because we've been loaded from bfcache");
    window.location.reload()
  }
});

window.addEventListener('pagehide', (ev: PageTransitionEvent) => {
  console.log("pagehide event", ev);
});
