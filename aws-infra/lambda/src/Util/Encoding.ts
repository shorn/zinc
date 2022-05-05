
export function decodeBase64(encodedText: string, decodeUri = false): string{
  if( decodeUri ){
    encodedText = decodeURIComponent(encodedText);
  }
  return Buffer.from(encodedText, 'base64').toString('ascii');
}

export function encodeBase64(plainText: string, encodeUri = false): string{
  let base64Encoded = Buffer.from(plainText).toString('base64');
  if( !encodeUri ){
    return base64Encoded;
  }
  
  return encodeURIComponent(base64Encoded);
}