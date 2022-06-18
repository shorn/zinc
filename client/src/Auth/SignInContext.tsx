import React, { useContext } from "react";

window.addEventListener('pageshow', (ev: PageTransitionEvent) => {
  console.log("onpageshow", ev);
  if( ev.persisted ){
    console.log("reloading page because it's a persisted load");
    window.location.reload()
  }
});

export type SignInState = {
  action: string | undefined,
  setAction: (action: string | undefined) => void,
};

console.log("SignInContext global init", new Date().toISOString());
export const SignInContext = React.createContext(
  undefined as unknown as SignInState);

/** If `use()` is called when not underneath the context provider,
 * they will get an error. */
export const useSignInContext = () => {
  let ctx = useContext(SignInContext);
  if( !ctx ){
    throw new Error("No SignInContextProvider present in component hierarchy");
  }
  return ctx;
};
