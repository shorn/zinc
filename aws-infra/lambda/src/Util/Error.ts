import { GENERIC_DENIAL } from "ZincApi/Authz/GuardAuthz";

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

export function isError<T>(e: T | Error): e is Error{
  if( e === undefined ){
    return false;
  }

  const error = e as Error;
  if( !error.name){
    return false;
  }
  if( !error.message ){
    return false;
  }
  return true;
}

export class AuthError extends Error {
  privateMsg: string;

  constructor({publicMsg, privateMsg}:{
    publicMsg: string,
    privateMsg: string,
  }){
    super(publicMsg);
    this.privateMsg = privateMsg;
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AuthError.prototype);
  }
  
  static generic(privateMsg: string): AuthError{ 
    return new AuthError({publicMsg: GENERIC_DENIAL, privateMsg});
  }
}

export function genericAuthError(privateMsg: string){
  return AuthError.generic(privateMsg);
}