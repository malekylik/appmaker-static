import * as commandLineArgs from 'command-line-args';


const optionDefinitions = [
  // { name: 'appId', alias: 'v', type: Boolean },
  { name: 'appId', type: String },
  // { name: 'login', type: String, multiple: true, defaultOption: true },
  { name: 'login', type: String },
  { name: 'password', type: String },
  { name: 'outDir', type: String },
  { name: 'headless', type: String }
  // { name: 'password', type: String },
];

export interface CommandLineOptions {
  appId?: string; login?: string; password?: string; outDir?: string;
  headless?: string;
}

export interface BrowserCommandLineOptions {
  headless: boolean | 'chrome';
}

export type RemoteMode = {
  appId: string;

  credentials: {
    login: string;
    password: string;
  };

  outDir: string;

  browserOptions: BrowserCommandLineOptions;
};

function parseBrowserCommandLineArgs(options: CommandLineOptions): BrowserCommandLineOptions {
  const { headless } = options;

  const browserOptions: BrowserCommandLineOptions = {
    headless: 'chrome'
  };

  if (headless) {
    if (headless === 'true') {
      browserOptions.headless = true;
    } else if (headless === 'false') {
      browserOptions.headless = false;
    } else if (headless === 'chrome') {
      browserOptions.headless = 'chrome';
    } else {
      console.log(`unknown value for headless ${headless}. Stick with value "${browserOptions.headless}". Possible values: true, false, chrome`);
    }
  }

  return browserOptions;
}

export function parseCommandLineArgs(): RemoteMode {
  const options: CommandLineOptions = commandLineArgs(optionDefinitions) as CommandLineOptions;

  const {
    appId, login, password, outDir = `${__dirname}/temp`,
  } = options;

  if (appId) {
    if (login === undefined || password === undefined) {
      console.log('For using script in remote mode please pass login and password');

      process.exit(1);
    }
  } else {
    console.log('For using script in remote mode please pass app id');

    process.exit(1);
  }

  const credentials = {
    login: login,
    password: password,
  };

  const browserOptions = parseBrowserCommandLineArgs(options);

  return ({
    appId,

    credentials,

    outDir,

    browserOptions,
  });
}