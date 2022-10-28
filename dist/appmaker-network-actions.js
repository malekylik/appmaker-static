"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeScreenshoot = exports.exportProject = exports.changeScriptFile = exports.getCommandNumberFromApp = exports.getXSRFToken = void 0;
const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);
// Status Code: 302 means need to relogin
function toUtfStr(str) {
    let end = '';
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\') {
            if (str[i + 1] === 'x') {
                const escape = str.slice(i, i + 4);
                if (escape[2] === '2' && escape[3] === '2') {
                    end += '"';
                }
                else if (escape[2] === '7' && escape[3] === 'b') {
                    end += '{';
                }
                else if (escape[2] === '7' && escape[3] === 'd') {
                    end += '}';
                }
                else {
                    end += escape;
                    console.warn('unknown escape seq', escape);
                }
                i += 3;
            }
            else {
                console.warn('unknown escape char', i + 1, str[i + 1]);
            }
        }
        else {
            end = end + str[i];
        }
    }
    return end;
}
// key for importing project
// fetch('https://appmaker.googleplex.com/_api/base/upload/v1/generate_file_upload_key', { method: 'POST', headers: { 'x-framework-xsrf-token': 'X1d1M1hhdVQ1akV4NGVDSWdldlJraHZhSmJqblJPSlpMYmZnSzlXVnhBMHwxNjY2Mjc2NzUyMTA0' } }).then((r) => r.json()).then(r => console.log(r))
// command used for updating app
// fetch('https://appmaker.googleplex.com/_api/editor/application_editor/v1/retrieve_commands', { method: 'POST', headers: { 'x-framework-xsrf-token': 'X1d1M1hhdVQ1akV4NGVDSWdldlJraHZhSmJqblJPSlpMYmZnSzlXVnhBMHwxNjY2Mjc2NzUyMTA0', 'content-type': 'application/jspblite2' }, body: JSON.stringify({"1":"RdeRXXpJpD", "2":"21621"}) }).then((r) => r.json()).then(r => console.log(r))
function getXSRFToken(page) {
    return page.waitForSelector('input[name="xsrfToken"]')
        .then(() => page.$eval('input[name="xsrfToken"]', (input) => {
        const xsrfToken = (input.value);
        return xsrfToken;
    }));
}
exports.getXSRFToken = getXSRFToken;
async function getCommandNumberFromApp(page) {
    var _a;
    const lastPart = await page.evaluate(() => {
        const script = document.body.children[0];
        const lastPart = script.innerText.slice(script.innerText.length - 100, script.innerText.length);
        return lastPart;
    });
    const commandId = (_a = toUtfStr(lastPart).match(/"2":"(\d+)"}/)) === null || _a === void 0 ? void 0 : _a[1];
    if (!commandId) {
        throw new Error('Cannot get command id');
    }
    return commandId;
}
exports.getCommandNumberFromApp = getCommandNumberFromApp;
var CommnadId;
(function (CommnadId) {
    CommnadId[CommnadId["paste"] = 22] = "paste";
})(CommnadId || (CommnadId = {}));
async function changeScriptFile(page, xsrfToken, login, fileKey, commandNumber, prevContent, content) {
    const res = await page.evaluate((xsrfToken, login, commandNumber, prevContent, content) => {
        const body = {
            "1": `${login}:1685428865:1666365626171`,
            "2": { "22": { "1": { "1": "RdeRXXpJpD", "2": { "1": fileKey } },
                    "2": { "1": content.length, "2": prevContent.length,
                        "3": [{
                                "1": prevContent.length,
                                "2": { "1": prevContent }, "3": 3
                            }, { "1": content.length, "2": { "1": content }, "3": 2 }] }, "3": "0" } },
            "3": commandNumber
        };
        const payload = {
            method: 'POST',
            headers: {
                'content-type': 'application/jspblite2',
                'x-framework-xsrf-token': xsrfToken,
            },
            body: JSON.stringify(body),
        };
        return fetch('https://appmaker.googleplex.com/_api/editor/application_editor/v1/execute_command', payload)
            .then(r => r.body)
            .then((rb) => {
            const reader = rb.getReader();
            return new ReadableStream({
                start(controller) {
                    // The following function handles each data chunk
                    function push() {
                        // "done" is a Boolean and value a "Uint8Array"
                        reader.read().then(({ done, value }) => {
                            // If there is no more data to read
                            if (done) {
                                console.log('done', done);
                                controller.close();
                                return;
                            }
                            // Get the data and send it to the browser via the controller
                            controller.enqueue(value);
                            // Check chunks by logging to the console
                            console.log(done, value);
                            push();
                        });
                    }
                    push();
                },
            });
        })
            .then((stream) => 
        // Respond with our stream
        new Response(stream, { headers: { 'Content-Type': 'application/zip' } }).blob())
            .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsBinaryString(blob);
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject('Error occurred while reading binary string');
        }));
    }, xsrfToken, login, commandNumber, prevContent, content);
    const parsedRes = JSON.parse(res);
    return parsedRes;
}
exports.changeScriptFile = changeScriptFile;
function exportProject(applicationId, xsrfToken) {
    return fetch('https://appmaker.googleplex.com/_am/exportApp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: (`applicationId=${applicationId}&xsrfToken=${xsrfToken}&revisionId=`)
    })
        .then(r => r.body)
        .then((rb) => {
        const reader = rb.getReader();
        return new ReadableStream({
            start(controller) {
                // The following function handles each data chunk
                function push() {
                    // "done" is a Boolean and value a "Uint8Array"
                    reader.read().then(({ done, value }) => {
                        // If there is no more data to read
                        if (done) {
                            console.log('done', done);
                            controller.close();
                            return;
                        }
                        // Get the data and send it to the browser via the controller
                        controller.enqueue(value);
                        // Check chunks by logging to the console
                        console.log(done, value);
                        push();
                    });
                }
                push();
            },
        });
    })
        .then((stream) => 
    // Respond with our stream
    new Response(stream, { headers: { 'Content-Type': 'application/zip' } }).blob())
        .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsBinaryString(blob);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject('Error occurred while reading binary string');
    }));
}
exports.exportProject = exportProject;
function takeScreenshoot(page, path = (__dirname + '/screenshot.png')) {
    return page.screenshot({ type: 'png', fullPage: true, captureBeyondViewport: true })
        .then((screenshot) => writeFile(path, screenshot));
}
exports.takeScreenshoot = takeScreenshoot;
