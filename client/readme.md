The front-end client infrastructure is laid out in [App.tsx](src/App.tsx),
following the idea of a
[funnel architecture](http://kopi.cloud/blog/2021/funnel-architecture/).

## Structure

* [Api](src/Api)
  * handles invoking endpoints of our Lambda based server-side API
  * types are shared between server and client via
    [ApiTypes.ts](../shared/ApiTypes.ts)
  * API implementation can be found in the
    [lambda project](../aws-infra/lambda/src/Api)
* [Auth](src/Auth)
  * handles signing-in - i.e. authentication with Google or Email and
    authorization via our server API
* [Component](src/Component)
  * React components that are re-used across the App
* [Design](src/Design)
  * Theme, App chrome like the NavBar / sliding drawer, layout components
* [Error](src/Error)
  * handling for rendering errors, server errors, etc.
* [Page](src/Page)
  * The actual pages of the App
  * Pages are "self-routed", 
    [NavigationProvider](src/Design/NavigationProvider.tsx) takes care of the
    transition animations and delegates to the
    [LocationPathname](src/Util/Hook/LocationPathname.tsx) hook to take care
    of `window.location` management, etc.
    * Look at the [Cabbage](https://github.com/kopi-cloud/cabbage/blob/2d0c602651c890eb5406e1408f2ba496bf4316aa/app/src/App.tsx#L32) 
    repo for more extensive exampel of self-routed pages.

## Building

The client is built via [create-react-app](https://create-react-app.dev/), using
components from the [MUI](https://mui.com/material-ui/) library.

* run `npm start-dev` for local development, it will use the API defined as as
  the server proxy in [package.json](package.json).
* run `npm build-prd` to build the App suitable for deployment
  * then deploy using the `deploy` command of the [aws-infra](../aws-infra)
    project 