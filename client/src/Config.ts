/** Helps manage configuration values across multiple environments.
 * <p>
 * The config values used by the app are decided when this file is run (i.e.
 * when the app is loaded into the browser), based on the value of
 * environmentName, which is compiled in at build time via the
 * REACT_APP_COG_POC_ENV environment variable.
 * <p>
 * Config values are embedded into the raw client javascript artifact - it is
 * designed only for static, publicly visible config (i.e. not per user stuff
 * and definitely not secrets).
 * <p>
 * Config is not suitable for secrets like API keys or other sensitive data.
 * <p>
 * EnvironmentConfig is things we expect to change between environments.
 * <p>
 * Note, often there'll be lots of config that ends up using the same values
 * across most environments. Avoid the temptation to re-invent the concept of  
 * "shared" environment configuration.  
 * Each config (`prd` / `tst` etc.) should be reviewable as a stand-alone unit
 * (in a non-IDE context).
 * Don't force reviewers to guess what the `prd` or `tst`config looks like by 
 * mentally reproducing your "shared config merging logic".  Preventing 
 * accidental/unexpected usage of bad config (e.g. a test or prod environment 
 * accidentally using a wrong DB or other system dependency) is more important
 * than your personal obsession with the DRY principle.
 */

const log = console;

/** Defines what the known environments are. */
type EnvironmentName = "prd" | "tst" | "ci" | "dev";

export interface EnvironmentConfig {
  /** identifies the environment */
  environmentName: EnvironmentName,

  /** is this a "production" environment (usually there's only one)? 
   * If you feel the need to have switchable business logic based off of
   * your environment, this is what it should be predicated on 
   * (i.e not "if config.envName === "prd").
   */
  isProd: boolean,

  cognito: {
    region: string,
    email: {
      userPoolId: string,
      userPoolClientId: string,
    },
    google: {
      userPoolId: string,
      userPoolClientId: string,
      userPoolDomain: string,
    }
  },
  
  /** Used to submit logs to Sentry instead of the Cabbage endpoint */
  sentryDsn?: string,
}

function initConfig(){
  const newConfig = {
    ...buildConfig,
    ...chooseEnvironmentConfig(process.env.REACT_APP_COG_POC_ENV),
  };

  // don't print the key; it's not a secret, but it's ugly
  const {...printConfig} = newConfig;
  log.debug("Application config",
    process.env.REACT_APP_CABBAGE_ENV, printConfig);
  return newConfig;
}

const buildConfig = {
  buildDate: process.env.REACT_APP_BUILD_DATE_MS ||
    new Date().getTime().toString(),
  gitCommit: process.env.REACT_APP_COMMIT_REF ?? "unknown commit",
};


function chooseEnvironmentConfig(env: string | undefined){
  /* trim() because env var can get polluted with whitespace when set via
  npm scripts.
  */
  env = env?.toLowerCase()?.trim();
  if( env === 'prd' ){
    return prdConfig
  }
  else if( env === 'tst' ){
    return tstConfig;
  }
  else if( env === 'ci' ){
    return ciConfig;
  }
  else {
    return devConfig;
  }
}

const ciConfig: EnvironmentConfig = {
  environmentName: "ci",
  isProd: false,
  cognito : {
    region: "unused",
    email: {
      userPoolId: "unused",
      userPoolClientId: "unused"
    },
    google: {
      userPoolId: "unused",
      userPoolClientId: "unused",
      userPoolDomain: "unused",
    }
  },
};

const devConfig: EnvironmentConfig = {
  environmentName: "dev",
  isProd: false,
  cognito : {
    region: "ap-southeast-2",
    email: {
      userPoolId: "ap-southeast-2_CQVVulGz5",
      userPoolClientId: "5olqlrovoqjtgnb6orcl2larnd"
    },
    google: {
      userPoolId: "ap-southeast-2_sxSfqgfX6",
      userPoolClientId: "7bjopbg1nl44qgsgqa89almsrv",
      userPoolDomain: "cog-poc-google2",
    }
  },
};

const tstConfig: EnvironmentConfig = {
  environmentName: "tst",
  isProd: false,
  cognito : {
    region: "unused",
    email: {
      userPoolId: "unused",
      userPoolClientId: "unused"
    },
    google: {
      userPoolId: "unused",
      userPoolClientId: "unused",
      userPoolDomain: "unused",
    }
  },
};

const prdConfig: EnvironmentConfig = {
  environmentName: "prd",
  isProd: true,
  cognito : {
    region: "ap-southeast-2",
    email: {
      userPoolId: "ap-southeast-2_CQVVulGz5",
      userPoolClientId: "5olqlrovoqjtgnb6orcl2larnd"
    },
    google: {
      userPoolId: "ap-southeast-2_sxSfqgfX6",
      userPoolClientId: "7bjopbg1nl44qgsgqa89almsrv",
      userPoolDomain: "cog-poc-google2",
    }
  }
};


export const Config: EnvironmentConfig & typeof buildConfig = initConfig();

