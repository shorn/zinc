/**
 * All the config methods are gathered here to keep them away from the lambda 
 * handler modules.  If you import a function (as opposed to types) from a 
 * handler module, it will run the `initConfig()` code of that lambda (because
 * the config init stuff is defined as a module global in order to happen at 
 * "cold start", but each time you import a function from some other lambda 
 * into your lambda, you're effectively "cold starting" that other lambda).
 * It's a waste of time and a source of errors (if the lambda uses different
 * ENV names to read the config, for example).
 * Note the ZincApiConfig is fine because it's off in it's own module.
 */

import { readJsonParam } from "Util/Ssm";
import { forceError } from "Util/Error";
import { z as zod } from "zod";

export const DirectTwitterAuthnConfig = zod.object({
  twitterConsumerKey: zod.string().nonempty(),
  twitterConsumerSecret: zod.string().nonempty(),
  // used by the TwitterHandler to create a JWT and ZincApi to validate it
  idTokenSecret: zod.string().nonempty().min(15),
  // used by ZincApi to validate the issuer
  functionUrl: zod.string().url().nonempty(),
  allowedCallbackUrls: zod.string().url().array().nonempty(),
});
export type DirectTwitterAuthnConfig =
  zod.infer<typeof DirectTwitterAuthnConfig>;

export const OAuthClientConfig = zod.object({
  clientId: zod.string(),
  clientSecret: zod.string(),
  allowedCallbackUrls: zod.string().url().array().nonempty(),
  functionUrl: zod.string().url(),
});
export type OAuthClientConfig = zod.infer<typeof OAuthClientConfig>;
export const oAuthClientConfigHelp = `
OAuthClientConfig:
* clientId, clientSecret 
  * sourced from OAuth configuration you create in the idprovider's UI 
    (google, github, etc.)  
  * used by the authn lambda in the processing of the "/idpresponse" call from
    the OIDC provider
  * used by the authz lambda verifying the id_token signature when exhanging 
    for an accessToken
* allowedCallbackUrls
  * no trailing slash
  * addresses that your site is served from that will be 
    "called back" once the user is authenticated 
  * examples: (localhsot for dev, cloudfront instances for test, prod, etc.)
  * used by the authn lambda to validate the state.redirect_uri
* functionUrl 
  * no trailing slash
  * address that the OIDC lambda is published at
  * used by the authz lambda when analysing the id_token "audience" claim
Example:   
`;
export const oAuthClientConfigExample: OAuthClientConfig = {
  clientId: "do not set in code",
  clientSecret: "do not set in code",
  allowedCallbackUrls: ["http://localhost:9090", "https://xxx.cloudfront.net"],
  functionUrl: "https://xxx.lambda-url.ap-southeast-2.on.aws",
};


export async function readTwitterConfigFromSsm(
  paramName: string|undefined
): Promise<DirectTwitterAuthnConfig|Error>{

  let paramValue: object;
  try {
    paramValue = await readJsonParam(paramName);
  }
  catch( err ){
    console.log(`problem reading lambda config from ${paramName}`);
    return forceError(err);
  }
  try {
    return DirectTwitterAuthnConfig.parse(paramValue);
  }
  catch( err ){
    console.log(`problem parsing lambda config from ${paramName}`,
      paramValue,
      "TODO:STO help ",
      "TODO:STO example" );
    return forceError(err);
  }
}

export async function readOAuthConfigFromSsm(
  paramName: string|undefined
): Promise<OAuthClientConfig|Error>{
  try {
    const paramValue = await readJsonParam(paramName);
    return OAuthClientConfig.parse(paramValue);
  }
  catch( err ){
    console.log(`problem parsing lambda config from ${paramName}`,
      oAuthClientConfigHelp,
      oAuthClientConfigExample );
    return forceError(err);
  }
}

