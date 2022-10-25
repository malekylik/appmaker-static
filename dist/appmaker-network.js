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
    await new Promise(res => setTimeout(res, 2000));
    if (!isAppPage(page.url())) {
        return;
    }
    console.log('click');
    // According to this MDN documentation, an element's offsetParent property will return null whenever it, or any of its parents, is hidden via the display style property.
    const clicked = await submitElement.evaluate(b => {
        if (b.offsetParent === null) {
            b.click();
            return true;
        }
        return false;
    });
    console.log('waiting for touch', clicked);
    // TODO: what if credentials have already been provided and only touch is left
    // await new Promise(res => setTimeout(res, 5000));
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
    return appZipPath;
}
async function callAppMakerApp(applicationId, credentials, options = {}) {
    var _a;
    const headless = (_a = options.headless) !== null && _a !== void 0 ? _a : 'chrome';
    const DEFAULT_ARGS = [
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
    ];
    console.log('launch --headless', headless);
    const browser = await puppeteer.launch({
        headless: headless,
        ignoreDefaultArgs: DEFAULT_ARGS,
        executablePath: '/usr/bin/google-chrome',
        // if the browser was not properly close, next run will probably end up with an error. Deleting this folder solve the error
        userDataDir: '/usr/local/google/home/kalinouski/Documents/headless_chrome'
    });
    console.log('open page');
    const page = await browser.newPage();
    try {
        await new Promise(res => setTimeout(res, 2000));
        console.log('newPage');
        // TODO: not always wait correctly
        await page.goto(`https://appmaker.googleplex.com/edit/${applicationId}`, { waitUntil: 'networkidle2' });
        if (isAuthPage(page.url())) {
            await auth(page, credentials);
        }
        if (isAppPage(page.url())) {
            return await app(page, applicationId);
        }
        else {
            throw new Error('unknown page: taking screen');
        }
    }
    catch (e) {
        console.log('error: taking screen', e);
        await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        throw e;
    }
    finally {
        console.log('closing');
        await browser.close();
    }
}
exports.callAppMakerApp = callAppMakerApp;
;
