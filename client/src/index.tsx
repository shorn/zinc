import React, { StrictMode } from 'react';
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
