export function formatCognitoIdpUrl({region, userPoolId}:{
  region: string,
  userPoolId: string,
}): string{
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

