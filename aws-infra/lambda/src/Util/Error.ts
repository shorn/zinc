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
}

