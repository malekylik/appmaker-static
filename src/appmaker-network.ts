import * as puppeteer from 'puppeteer';

const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);

import { getXSRFToken, exportProject, takeScreenshoot, getCommandNumberFromApp, retrieveCommands, RequestResponse, RequestError, changeScriptFile } from './appmaker-network-actions';

import * as O from 'fp-ts/lib/Option';

const editAppMakerPageUrl = 'appmaker.googleplex.com/edit';
const authPageUrl = 'login.corp.google.com';

export async function openBrowser(options: { headless?: boolean | 'chrome' } = {}): Promise<puppeteer.Browser> {
  const headless = options.headless ?? 'chrome';

  const DEFAULT_ARGS: Array<string> = [
  '--disable-background-networking',

  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  ];

  console.log('launch --headless', headless);
  return await puppeteer.launch({
    headless: headless,
    ignoreDefaultArgs: DEFAULT_ARGS,
    executablePath: '/usr/bin/google-chrome',
    // if the browser was not properly close, next run will probably end up with an error. Deleting this folder solve the error
    userDataDir: '/usr/local/google/home/kalinouski/Documents/headless_chrome'
  });
}

export function isAuthPage(url: string): boolean {
  return url.includes(authPageUrl);
}

export function isAppPage(url: string): boolean {
  return url.includes(editAppMakerPageUrl);
}

export async function auth(page: puppeteer.Page, credentials: { login: string; password: string; }) {
  console.log('auth routine');

  console.log('fill credits');

  let isUserNameFilled = true;
  let isUserPasswordFilled = true;

  // TODO: what if credentials have already been provided and only touch is left
  try {
    await page.$eval("#username", (element: any, login: string) => element.value = login, credentials.login);
  } catch {
    isUserNameFilled = false;
  }

  try {
    await page.$eval("#password", (element: any, password: string) => element.value = password, credentials.password);
  } catch {
    isUserPasswordFilled = false;
  }

  await new Promise(res => setTimeout(res, 2000));

  const submitElement = await page.$('#signInButton');

  if (!isAppPage(page.url())) {
    return;
  }

  if (!isUserNameFilled && !isUserPasswordFilled) {
    console.log('Couldnt find both name and password fields. Skip auth');
    return;
  }

  console.log('click');
  // According to this MDN documentation, an element's offsetParent property will return null whenever it, or any of its parents, is hidden via the display style property.
  const clicked = await submitElement!.evaluate(b => {
    //if ((b as any).offsetParent === null) {
      (b as any).click();

      return true;
  //  }

//    return false;
  });

  console.log('waiting for touch', clicked);

  // TODO: what if credentials have already been provided and only touch is left
  // await new Promise(res => setTimeout(res, 5000));

  await page.waitForNavigation({ waitUntil: 'networkidle2' });
}

/**
 * @param page
 * @param applicationId
 * @returns
 */
export async function app(page: puppeteer.Page, applicationId: string) {
  console.log('app routine');

  const xsrfToken = await getXSRFToken(page);

  console.log('get xsrf token', xsrfToken);
  
  console.log('try to export project');

  const appZipText = await page.evaluate(exportProject, applicationId, xsrfToken);

  const appZipPath = __dirname + '/app.zip';

  console.log(`exporting done`);
  console.log(`writing to ${appZipPath}`);

  await writeFile(appZipPath, Buffer.from(appZipText, 'binary'));

  return appZipPath;
}

export async function initBrowserWithAppMakerApp(browser: puppeteer.Browser, applicationId: string, credentials: { login: string; password: string; }): Promise<puppeteer.Page> {
  let page = null;

  try {
    console.log('open page');

    page = await browser.newPage()
  } catch (e) {
    console.log('error: cant open page', e);

    console.log('callAppMakerApp closing');
    await browser.close();

    throw e;
  }

  try {
    await new Promise(res => setTimeout(res, 2000));

    console.log('newPage');

    // TODO: not always wait correctly
    await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, {waitUntil: 'networkidle2', timeout: 60000});

    if (isAuthPage(page.url())) {
      await auth(page, credentials);
    }

    return page;
  } catch (e) {
    console.log('error: taking screen', e);

    await takeScreenshoot(page);

    console.log('initBrowserWithAppMakerApp: closing browser');
    await browser.close();

    throw e;
  }
}

export async function callAppMakerApp(applicationId: string, credentials: { login: string; password: string; }, options: { headless?: boolean | 'chrome' } = {}) {
  const browser = await openBrowser(options);

  let page = null;

  try {
      page = await initBrowserWithAppMakerApp(browser, applicationId, credentials);

    if (isAppPage(page.url())) {
      return await app(page, applicationId);
    } else {
      throw new Error('unknown page: taking screen');
    }
  } catch (e) {
    if (page) {
      console.log('error: taking screen', e);
      await takeScreenshoot(page);
    } else {
      console.log('error: page is not defined', e);
    }

    throw e;
  } finally {
    console.log('callAppMakerApp closing');
    await browser.close();
  }
};

export interface PageAPI {
  exportApplication(applicationId: string): Promise<O.Option<string>>;

  getXSRFToken(): Promise<O.Option<string>>;

  getCommandNumberFromApp(): Promise<O.Option<string>>;

  getCommandNumberFromServer(xsrfToken: string, appKey: string, currentCommandNumber: string): Promise<O.Option<RequestResponse | RequestError>>;

  changeScriptFile(
    xsrfToken: string, appId: string, login: string, fileKey: string, commandNumber: string, prevContent: string, content: string
  ): Promise<O.Option<RequestResponse | RequestError>>;

  close(): Promise<O.Some<void>>;
}

export async function runInApplicationPageContext(applicationId: string, credentials: { login: string; password: string; }, options: { headless?: boolean | 'chrome' }, callback: (pageAPI: PageAPI) => Promise<unknown>) {
  const browser = await openBrowser(options);

  let page: puppeteer.Page | null = null;

  try {
    page = await initBrowserWithAppMakerApp(browser, applicationId, credentials);

    async function saveCall<T>(callback: (page: puppeteer.Page) => Promise<T>): Promise<O.Option<T>> {
      try {
        return O.some(await callback(page!));
      } catch (e) {
        console.log('saveCall: wasnt able to performe call ' + e);
        console.log('callAppMakerApp closing');
        await browser.close();

        return O.none;
      }
    }

    const pageAPI: PageAPI = {
      exportApplication(applicationId: string) {
        return saveCall(page => app(page, applicationId));
      },

      getXSRFToken() {
        return saveCall(getXSRFToken);
      },

      getCommandNumberFromApp() {
        return saveCall(getCommandNumberFromApp);
      },

      getCommandNumberFromServer(xsrfToken: string, appKey: string, currentCommandNumber: string) {
        return saveCall(page => retrieveCommands(page, xsrfToken, appKey, currentCommandNumber));
      },

      changeScriptFile(
        xsrfToken: string, appId: string, login: string, fileKey: string, commandNumber: string, prevContent: string, content: string
      ) {
        return saveCall(page => changeScriptFile(page, xsrfToken, appId, login, fileKey, commandNumber, prevContent, content));
      },

      close() {
        return saveCall(async (page) => {
          await page.close();
          await browser.close();
        }) as Promise<O.Some<void>>;
      }
    };

    if (isAppPage(page.url())) {
      await callback(pageAPI);
    } else {
      throw new Error('unknown page: taking screen');
    }
  } catch (e) {
    if (page) {
      console.log('error: taking screen', e);
      await takeScreenshoot(page);
    } else {
      console.log('error: page is not defined', e);
    }

    throw e;
  } finally {
    console.log('callAppMakerApp closing');
    await browser.close();
  }
}
