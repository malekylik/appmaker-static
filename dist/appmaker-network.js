"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInApplicationPageContext = exports.callAppMakerApp = exports.initBrowserWithAppMakerApp = exports.app = exports.auth = exports.isAppPage = exports.isAuthPage = exports.openBrowser = void 0;
const puppeteer = require("puppeteer");
const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);
const appmaker_network_actions_1 = require("./appmaker-network-actions");
const editAppMakerPageUrl = 'appmaker.googleplex.com/edit';
const authPageUrl = 'login.corp.google.com';
async function openBrowser(options = {}) {
    const headless = options.headless ?? 'chrome';
    const DEFAULT_ARGS = [
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
exports.openBrowser = openBrowser;
function isAuthPage(url) {
    return url.includes(authPageUrl);
}
exports.isAuthPage = isAuthPage;
function isAppPage(url) {
    return url.includes(editAppMakerPageUrl);
}
exports.isAppPage = isAppPage;
async function auth(page, credentials) {
    console.log('auth routine');
    console.log('fill credits');
    let isUserNameFilled = true;
    let isUserPasswordFilled = true;
    // TODO: what if credentials have already been provided and only touch is left
    try {
        await page.$eval("#username", (element, login) => element.value = login, credentials.login);
    }
    catch {
        isUserNameFilled = false;
    }
    try {
        await page.$eval("#password", (element, password) => element.value = password, credentials.password);
    }
    catch {
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
    const clicked = await submitElement.evaluate(b => {
        //if ((b as any).offsetParent === null) {
        b.click();
        return true;
        //  }
        //    return false;
    });
    console.log('waiting for touch', clicked);
    // TODO: what if credentials have already been provided and only touch is left
    // await new Promise(res => setTimeout(res, 5000));
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
}
exports.auth = auth;
/**
 * @param page
 * @param applicationId
 * @returns
 */
async function app(page, applicationId) {
    console.log('app routine');
    const xsrfToken = await (0, appmaker_network_actions_1.getXSRFToken)(page);
    console.log('get xsrf token', xsrfToken);
    console.log('try to export project');
    const appZipText = await page.evaluate(appmaker_network_actions_1.exportProject, applicationId, xsrfToken);
    const appZipPath = __dirname + '/app.zip';
    console.log(`exporting done`);
    console.log(`writing to ${appZipPath}`);
    await writeFile(appZipPath, Buffer.from(appZipText, 'binary'));
    return appZipPath;
}
exports.app = app;
async function initBrowserWithAppMakerApp(browser, applicationId, credentials) {
    let page = null;
    try {
        console.log('open page');
        page = await browser.newPage();
    }
    catch (e) {
        console.log('error: cant open page', e);
        console.log('callAppMakerApp closing');
        await browser.close();
        throw e;
    }
    try {
        await new Promise(res => setTimeout(res, 2000));
        console.log('newPage');
        // TODO: not always wait correctly
        await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, { waitUntil: 'networkidle2', timeout: 60000 });
        if (isAuthPage(page.url())) {
            await auth(page, credentials);
        }
        return page;
    }
    catch (e) {
        console.log('error: taking screen', e);
        await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        console.log('initBrowserWithAppMakerApp: closing browser');
        await browser.close();
        throw e;
    }
}
exports.initBrowserWithAppMakerApp = initBrowserWithAppMakerApp;
async function callAppMakerApp(applicationId, credentials, options = {}) {
    const browser = await openBrowser(options);
    let page = null;
    try {
        page = await initBrowserWithAppMakerApp(browser, applicationId, credentials);
        if (isAppPage(page.url())) {
            return await app(page, applicationId);
        }
        else {
            throw new Error('unknown page: taking screen');
        }
    }
    catch (e) {
        if (page) {
            console.log('error: taking screen', e);
            await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        }
        else {
            console.log('error: page is not defined', e);
        }
        throw e;
    }
    finally {
        console.log('callAppMakerApp closing');
        await browser.close();
    }
}
exports.callAppMakerApp = callAppMakerApp;
;
async function runInApplicationPageContext(applicationId, credentials, options, callback) {
    const browser = await openBrowser(options);
    let page = null;
    try {
        page = await initBrowserWithAppMakerApp(browser, applicationId, credentials);
        if (isAppPage(page.url())) {
            await callback(page);
        }
        else {
            throw new Error('unknown page: taking screen');
        }
    }
    catch (e) {
        if (page) {
            console.log('error: taking screen', e);
            await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        }
        else {
            console.log('error: page is not defined', e);
        }
        throw e;
    }
    finally {
        console.log('callAppMakerApp closing');
        await browser.close();
    }
}
exports.runInApplicationPageContext = runInApplicationPageContext;
