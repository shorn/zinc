import * as React from "react";

export function isMounted(){
  const isMountedRef = React.useRef(false);

  React.useEffect(()=>{
    isMountedRef.current = true;
    return ()=>{isMountedRef.current = false};
  }, [isMountedRef])

  return isMountedRef;
}