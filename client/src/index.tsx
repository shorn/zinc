import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import {App} from "App";
import { authApi } from "Api/AuthApi";
import { ServerInfo } from "shared";

/* load this as early as possible to trigger lambda cold start.
There's gotta be a better way, I'd prefer this was issued directly from 
index.html, even before any script is loaded - but `<link rel="preload">` 
doesn't seem to work. 
Unless I put the lambda as the target of the `shortcut icon` (favicon) link, 
but that's icky.
*/
export const serverConfigRequest: Promise<ServerInfo> = authApi.readConfig();
(async ()=> await serverConfigRequest)();

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
