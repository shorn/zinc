import React, { useContext } from "react";
import { PostApi } from "Shared/ApiTypes";
import { useAuth } from "Auth/AuthProvider";
import { apiMapPost } from "Api/PocServerApi";

/** The PostAPi is defined as a React Context so that our provider
 * can do the infrastructure work of worrying about authorization and the
 * user can just do `usePostApi()` and call what they need.
 */
const PostApiContext = React.createContext(
  undefined as unknown as PostApi );

/** Calling `use()` from component that is not a child a provider will error. */
export const usePostApi = ()=> {
  let ctx = useContext(PostApiContext);
  if( !ctx ){
    throw new Error("No ApiProvider present in component hierarchy");
  }
  return ctx;
};

export function PostApiProvider({children}: {children: React.ReactNode}){
  const token = useAuth().session.accessToken;
  /* If the accessToken changes, then this will re-render and bind the new
  token into the api. */
  return <PostApiContext.Provider value={{
    /* Now that these are all exactly the same shape, could just do this 
    dynamically and force it with a cast. */
    listUser: req => apiMapPost("listUser", req, token),
    readUser: req => apiMapPost("readUser", req, token),
    updateUser: req => apiMapPost("updateUser", req, token),
  }}>
    {children}
  </PostApiContext.Provider>;
}


