export function forceError(e: unknown): Error{
  if( !e ){
    return new Error("[null or undefined]");
  }
  if( e instanceof Error ){
    return e;
  }
  if( typeof e === 'string' ){
    return new Error(e);
  }
  if( typeof e === 'object' ){
    return new Error(e.toString());
  }
  return new Error("unknown error");
}

