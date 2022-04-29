import { AuthApi } from "shared/ApiTypes";
import { apiMapGet } from "Api/PocServerApi";

/**
 * No point doing a whole provider just for these two methods that are only
 * used by the AuthP/ServerInfo provider infrastructure anyway.
 */
export const authApi: AuthApi = {
  authorize: (idToken) => apiMapGet("authorize", idToken),
  readConfig: () => apiMapGet("readConfig"),
}


