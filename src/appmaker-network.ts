import * as puppeteer from 'puppeteer';

const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);

import { getXSRFToken, exportProject, takeScreenshoot } from './appmaker-network-actions';

const editAppMakerPageUrl = 'appmaker.googleplex.com/edit';
const authPageUrl = 'login.corp.google.com';

function isAuthPage(url: string): boolean {
  return url.includes(authPageUrl);
}

function isAppPage(url: string): boolean {
  return url.includes(editAppMakerPageUrl);
}

async function auth(page: puppeteer.Page, credentials: { login: string; password: string; }) {
  console.log('auth routine');

  console.log('fill credits');

  // TODO: what if credentials have already been provided and only touch is left
  await page.$eval("#username", (element: any, login: string) => element.value = login, credentials.login);
  await page.$eval("#password", (element: any, password: string) => element.value = password, credentials.password);

  const submitElement = await page.$('#signInButton');

  console.log('click');

  await submitElement!.click();

  console.log('waiting for touch');

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
}


export async function callAppMakerApp () {
  const credentials = {
    login: '',
    password: '',
  };

  const applicationId = 'RdeRXXpJpD';

  const DEFAULT_ARGS: Array<string> = [
  '--disable-background-networking',

  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  ];

  console.log('launch');
  const browser = await puppeteer.launch({
    // headless: false,
    headless: 'chrome',
    ignoreDefaultArgs: DEFAULT_ARGS,
    executablePath: '/usr/bin/google-chrome',
    userDataDir: '/usr/local/google/home/kalinouski/Documents/headless_chrome'
  });

  console.log('open page');

  const page = await browser.newPage();

  await new Promise(res => setTimeout(res, 2000));

  console.log('newPage');

  // TODO: not always wait correctly
  await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, {waitUntil: 'networkidle2'});

  if (isAuthPage(page.url())) {
    await auth(page, credentials);
  } 

  if (isAppPage(page.url())) {
    try {
      await app(page, applicationId);
    } catch (e) { console.log(e); }
  } else {
    console.log('unknown page');
  }

  console.log('taking screen');
  await takeScreenshoot(page);
  console.log('closing');

  await browser.close();
};