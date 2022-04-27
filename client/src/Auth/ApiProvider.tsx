import React, { useContext } from "react";
import { PostApi } from "shared";
import { apiMapPost } from "Server/Api";
import { useAuthn } from "Auth/AuthenticationProvider";

const ApiContext = React.createContext(
  undefined as unknown as PostApi );
export const usePostApi = ()=> {
  let ctx = useContext(ApiContext);
  if( !ctx ){
    throw new Error("No ApiProvider present in component hierarchy");
  }
  return ctx;
};

export function ApiProvider({children}: {children: React.ReactNode}){
  const token = useAuthn().session.accessToken;
  /* If the accessToken changes, then this will re-render and bind the new
  token into the api.
   */
  return <ApiContext.Provider value={{
    /* Now that these are all exactly the same shape, could just do this 
    dynamically and force it with a cast. */
    listUser: req => apiMapPost("listUser", req, token),
    readUser: req => apiMapPost("readUser", req, token),
    updateUser: req => apiMapPost("updateUser", req, token),
  }}>
    {children}
  </ApiContext.Provider>;
}