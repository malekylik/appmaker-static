"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInApplicationPageContext = exports.callAppMakerApp = exports.initBrowserWithAppMakerApp = exports.app = exports.auth = exports.isAppPage = exports.isAuthPage = exports.openBrowser = void 0;
const puppeteer = require("puppeteer");
const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);
const appmaker_network_actions_1 = require("./appmaker-network-actions");
const O = require("fp-ts/lib/Option");
const logger_1 = require("./logger");
const editAppMakerPageUrl = 'appmaker.googleplex.com/edit';
const authPageUrl = 'login.corp.google.com';
async function openBrowser(options = {}) {
    const headless = options.headless ?? 'chrome';
    const DEFAULT_ARGS = [
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
    ];
    logger_1.logger.log('launch --headless', headless);
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
    logger_1.logger.log('auth routine');
    logger_1.logger.log('fill credits');
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
        logger_1.logger.log('Couldnt find both name and password fields. Skip auth');
        return;
    }
    logger_1.logger.log('click');
    // According to this MDN documentation, an element's offsetParent property will return null whenever it, or any of its parents, is hidden via the display style property.
    const clicked = await submitElement.evaluate(b => {
        //if ((b as any).offsetParent === null) {
        b.click();
        return true;
        //  }
        //    return false;
    });
    logger_1.logger.log('waiting for touch', clicked);
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
    logger_1.logger.log('app routine');
    const xsrfToken = await (0, appmaker_network_actions_1.getXSRFToken)(page);
    logger_1.logger.log('get xsrf token', xsrfToken);
    logger_1.logger.log('try to export project');
    const appZipText = await page.evaluate(appmaker_network_actions_1.exportProject, appmaker_network_actions_1.APPMAKER_URL_API, applicationId, xsrfToken);
    const appZipPath = __dirname + '/app.zip';
    logger_1.logger.log(`exporting done`);
    logger_1.logger.log(`writing to ${appZipPath}`);
    await writeFile(appZipPath, Buffer.from(appZipText, 'binary'));
    return appZipPath;
}
exports.app = app;
async function initBrowserWithAppMakerApp(browser, applicationId, credentials) {
    let page = null;
    try {
        logger_1.logger.log('open page');
        page = await browser.newPage();
    }
    catch (e) {
        logger_1.logger.log('error: cant open page', e);
        logger_1.logger.log('callAppMakerApp closing');
        await browser.close();
        throw e;
    }
    try {
        await new Promise(res => setTimeout(res, 2000));
        logger_1.logger.log('newPage');
        // TODO: not always wait correctly
        await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, { waitUntil: 'networkidle2', timeout: 60000 });
        if (isAuthPage(page.url())) {
            await auth(page, credentials);
        }
        return page;
    }
    catch (e) {
        logger_1.logger.log('error: taking screen', e);
        await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        logger_1.logger.log('initBrowserWithAppMakerApp: closing browser');
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
            logger_1.logger.log('error: taking screen', e);
            await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        }
        else {
            logger_1.logger.log('error: page is not defined', e);
        }
        throw e;
    }
    finally {
        logger_1.logger.log('callAppMakerApp closing');
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
        async function saveCall(callback) {
            try {
                return O.some(await callback(page));
            }
            catch (e) {
                logger_1.logger.log('saveCall: wasnt able to performe call ' + e);
                logger_1.logger.log('callAppMakerApp closing');
                await browser.close();
                return O.none;
            }
        }
        const pageAPI = {
            exportApplication(applicationId) {
                return saveCall(page => app(page, applicationId));
            },
            getXSRFToken() {
                return saveCall(appmaker_network_actions_1.getXSRFToken);
            },
            getCommandNumberFromApp() {
                return saveCall(appmaker_network_actions_1.getCommandNumberFromApp);
            },
            getCommandNumberFromServer(xsrfToken, appKey, currentCommandNumber) {
                return saveCall(page => (0, appmaker_network_actions_1.retrieveCommands)(page, xsrfToken, appKey, currentCommandNumber));
            },
            changeScriptFile(xsrfToken, appId, login, fileKey, commandNumber, prevContent, content) {
                return saveCall(page => (0, appmaker_network_actions_1.changeScriptFile)(page, xsrfToken, appId, login, fileKey, commandNumber, prevContent, content));
            },
            close() {
                return saveCall(async (page) => {
                    await page.close();
                    await browser.close();
                });
            }
        };
        if (isAppPage(page.url())) {
            await callback(pageAPI);
        }
        else {
            throw new Error('unknown page: taking screen');
        }
    }
    catch (e) {
        if (page) {
            logger_1.logger.log('error: taking screen', e);
            await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        }
        else {
            logger_1.logger.log('error: page is not defined', e);
        }
        throw e;
    }
    finally {
        logger_1.logger.log('callAppMakerApp closing');
        await browser.close();
    }
}
exports.runInApplicationPageContext = runInApplicationPageContext;
