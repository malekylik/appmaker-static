import * as puppeteer from 'puppeteer';

const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);

import { getXSRFToken, exportProject, takeScreenshoot, getCommandNumberFromApp, executeCommand, getContent } from './appmaker-network-actions';

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

  // TODO: what if credentials have already been provided and only touch is left
  await page.$eval("#username", (element: any, login: string) => element.value = login, credentials.login);
  await page.$eval("#password", (element: any, password: string) => element.value = password, credentials.password);

  const submitElement = await page.$('#signInButton');

  await new Promise(res => setTimeout(res, 2000));

  if (!isAppPage(page.url())) {
    return;
  }

  console.log('click');
  // According to this MDN documentation, an element's offsetParent property will return null whenever it, or any of its parents, is hidden via the display style property.
  const clicked = await submitElement!.evaluate(b => {
    if ((b as any).offsetParent === null) {
      (b as any).click();

      return true;
    }

    return false;
  });

  console.log('waiting for touch', clicked);

  // TODO: what if credentials have already been provided and only touch is left
  // await new Promise(res => setTimeout(res, 5000));

  await page.waitForNavigation({ waitUntil: 'networkidle2' });
}

async function app(page: puppeteer.Page, applicationId: string) {
  console.log('app routine');

  const xsrfToken = await getXSRFToken(page);

  console.log('get xsrf token', xsrfToken);
  
  console.log('try to export project');

  const appZipText = await page.evaluate(exportProject, applicationId, xsrfToken);

  const appZipPath = __dirname + '/app.zip';

  console.log(`exporting done`);
  console.log(`writting to ${appZipPath}`);

  await writeFile(appZipPath, Buffer.from(appZipText, 'binary'));

  return appZipPath;
}

export async function callAppMakerApp (applicationId: string, credentials: { login: string; password: string; }, options: { headless?: boolean | 'chrome' } = {}) {
  const browser = await openBrowser();

  let page = null;

  try {
    console.log('open page');

    page = await browser.newPage()
  } catch (e) {
    console.log('error: cant open page', e);

    console.log('closing');
    await browser.close();

    throw e;
  }

  try {
    await new Promise(res => setTimeout(res, 2000));

    console.log('newPage');

    // TODO: not always wait correctly
    await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, {waitUntil: 'networkidle2'});

    if (isAuthPage(page.url())) {
      await auth(page, credentials);
    }

    if (isAppPage(page.url())) {
      return await app(page, applicationId);
    } else {
      throw new Error('unknown page: taking screen');
    }
  } catch (e) {
    console.log('error: taking screen', e);
    await takeScreenshoot(page);

    throw e;
  } finally {
    console.log('closing');
    await browser.close();
  }
};
