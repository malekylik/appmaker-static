"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAppMakerApp = void 0;
const puppeteer = require("puppeteer");
const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);
const appmaker_network_actions_1 = require("./appmaker-network-actions");
const editAppMakerPageUrl = 'appmaker.googleplex.com/edit';
const authPageUrl = 'login.corp.google.com';
function isAuthPage(url) {
    return url.includes(authPageUrl);
}
function isAppPage(url) {
    return url.includes(editAppMakerPageUrl);
}
async function auth(page, credentials) {
    console.log('auth routine');
    console.log('fill credits');
    // TODO: what if credentials have already been provided and only touch is left
    await page.$eval("#username", (element, login) => element.value = login, credentials.login);
    await page.$eval("#password", (element, password) => element.value = password, credentials.password);
    const submitElement = await page.$('#signInButton');
    console.log('click');
    await submitElement.click();
    console.log('waiting for touch');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
}
async function app(page, applicationId) {
    console.log('app routine');
    const xsrfToken = await (0, appmaker_network_actions_1.getXSRFToken)(page);
    console.log('get xsrf token', xsrfToken);
    console.log('try to export project');
    const appZipText = await page.evaluate(appmaker_network_actions_1.exportProject, applicationId, xsrfToken);
    const appZipPath = __dirname + '/app.zip';
    console.log(`exporting done`);
    console.log(`writting to ${appZipPath}`);
    await writeFile(appZipPath, Buffer.from(appZipText, 'binary'));
}
async function callAppMakerApp() {
    const credentials = {
        login: 'kalinouski@google.com',
        password: '2GbMwPh7t',
    };
    const applicationId = 'RdeRXXpJpD';
    const DEFAULT_ARGS = [
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
    await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, { waitUntil: 'networkidle2' });
    if (isAuthPage(page.url())) {
        await auth(page, credentials);
    }
    if (isAppPage(page.url())) {
        try {
            await app(page, applicationId);
        }
        catch (e) {
            console.log(e);
        }
    }
    else {
        console.log('unknown page');
    }
    console.log('taking screen');
    await (0, appmaker_network_actions_1.takeScreenshoot)(page);
    console.log('closing');
    await browser.close();
}
exports.callAppMakerApp = callAppMakerApp;
;
