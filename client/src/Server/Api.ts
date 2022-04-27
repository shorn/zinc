import {
  AuthApi,
  PostApi
} from "shared/ApiTypes";
import { fetchGet, fetchPost } from "Util/Http";

// defined by the cloudfront definition in CloudfrontStack
const apiPrefix = "api-prd-v2";

export type AuthorizeResponse = {
  succeeded: true,
  accessToken: string,
} | {
  succeeded: false,
  message: string,
}

export const authApi: AuthApi = {
  authorize: (idToken) => apiMapGet("authorize", idToken),
  readConfig: () => apiMapGet("readConfig"),
}

export function apiMapGet<TResult>(
  name: string,
  accessToken?: string
): Promise<TResult>{
  // no checking, we just assume it's the shape we want 
  return fetchGet(
    `/${apiPrefix}/${name}`,
    accessToken
  ) as Promise<TResult>;
}

export function apiMapPost<TReqest, TResult>(
  name: string,
  req: TReqest,
  accessToken: string
): Promise<TResult>{
  // no checking, we just assume it's the shape we want 
  return fetchPost(
    `/${apiPrefix}/${name}`,
    req,
    accessToken
  ) as Promise<TResult>;
}

