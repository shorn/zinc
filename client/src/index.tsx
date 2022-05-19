import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import {App} from "App";
import { authApi } from "Api/AuthApi";
import { ServerInfo } from "Shared/ApiTypes";

/* load this as early as possible to trigger lambda cold start. */
export const serverConfigRequest: Promise<ServerInfo> = authApi.readConfig();
(async ()=> await serverConfigRequest)();

ReactDOM.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>, 
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
