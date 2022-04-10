import React, { useContext } from "react";
import { CognitoUserSession } from "amazon-cognito-identity-js";

export interface ApiState {
  api: Api,
}

const ApiContext = React.createContext(
  undefined as unknown as ApiState );
export const useAuthn = ()=> {
  let ctx = useContext(ApiContext);
  if( !ctx ){
    throw new Error("No ApiProvider present in component hierarchy");
  }
  return ctx;
};

export function ApiProvider({children}: {children: React.ReactNode}){
  //const authn = useAuthn();
  return <ApiContext.Provider value={{
    api: {}
  }}>
    {children}
  </ApiContext.Provider>;
}

export interface Api {
}