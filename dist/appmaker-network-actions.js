"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeScreenshoot = exports.exportProject = exports.changeScriptFile = exports.retrieveCommands = exports.isRequestError = exports.isRequestResponse = exports.getCommandNumberFromApp = exports.getXSRFToken = exports.getClientEnvironment = void 0;
const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);
// Status Code: 302 means need to relogin
// POST https://spotlight-dev-sprabahar.googleplex.com/_api/base/app_data/v1/query_records 412 - reload required
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
async function getClientEnvironment(page) {
    const resultHandle = await page.evaluateHandle(() => window.clientEnvironment);
    const clientEnvironment = await resultHandle.jsonValue();
    resultHandle.dispose();
    return Promise.resolve(clientEnvironment);
}
exports.getClientEnvironment = getClientEnvironment;
async function getXSRFToken(page) {
    const clientEnvironment = await getClientEnvironment(page);
    return clientEnvironment.initialXsrfToken;
}
exports.getXSRFToken = getXSRFToken;
async function getCommandNumberFromApp(page) {
    const lastPart = await page.evaluate(() => {
        const script = document.body.children[0];
        const lastPart = script.innerText.slice(script.innerText.length - 100, script.innerText.length);
        return lastPart;
    });
    const commandId = toUtfStr(lastPart).match(/"2":"(\d+)"}/)?.[1];
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
// {
//   "response": [{
//     "changeScriptCommand": {
//       "key": {
//         "applicationKey": "KIx47x0MqU",
//         "localKey": "KvnDexb6pseSmosN462IoKCbff76H6ts"
//       },
//       "scriptChange": {
//         "lengthAfter": 1467,
//         "lengthBefore": 1466,
//         "modifications": [{
//           "length": 26,
//           "type": "SKIP"
//         }, {
//           "length": 1,
//           "text": "1",
//           "type": "INSERT"
//         }, {
//           "length": 1440,
//           "type": "SKIP"
//         }]
//       },
//       "sequenceNumber": "4291"
//     }
//   }]
// }
// res { response: [ { addModelDataSourceCommand: [Object] } ] }
// string application_key = 1;
// // TODO(b/171309255): add comments.
// int64 sequence_number = 2;
const isRequestResponse = (response) => response !== null && typeof response === 'object' && 'response' in response && Array.isArray(response.response);
exports.isRequestResponse = isRequestResponse;
const isRequestError = (response) => response !== null && typeof response === 'object' && 'type' in response && 'message' in response;
exports.isRequestError = isRequestError;
async function retrieveCommands(page, xsrfToken, appKey, currentCommandNumber) {
    const res = await page.evaluate((xsrfToken, _appKey, _commandNumber) => {
        const body = {
            "1": _appKey,
            "2": _commandNumber
        };
        const payload = {
            method: 'POST',
            headers: {
                'content-type': 'application/jspblite2', // check what the type
                'x-framework-xsrf-token': xsrfToken,
            },
            body: JSON.stringify(body),
        };
        return fetch('https://appmaker.googleplex.com/_api/editor/application_editor/v1/retrieve_commands', payload)
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
    }, xsrfToken, appKey, currentCommandNumber);
    const parsedRes = JSON.parse(res);
    return parsedRes;
}
exports.retrieveCommands = retrieveCommands;
async function changeScriptFile(page, xsrfToken, appId, login, fileKey, commandNumber, prevContent, content) {
    const body = {
        "1": `${login}:-65675019:1709725791108`, // dont know numbers
        "2": {
            "22": {
                "1": {
                    "1": appId,
                    "2": { "1": fileKey }
                },
                "2": { "1": content.length, "2": prevContent.length,
                    "3": [
                        {
                            "1": prevContent.length,
                            "2": { "1": prevContent }, "3": 3
                        }, { "1": content.length, "2": { "1": content }, "3": 2 }
                    ] }, "3": "0"
            }
        },
        "3": commandNumber
    };
    const res = await page.evaluate((_xsrfToken, _body) => {
        const payload = {
            method: 'POST',
            headers: {
                'content-type': 'application/jspblite2', // check what the type
                'x-framework-xsrf-token': _xsrfToken,
            },
            body: _body,
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
    }, xsrfToken, JSON.stringify(body));
    const parsedRes = JSON.parse(res);
    return parsedRes;
}
exports.changeScriptFile = changeScriptFile;
/**
 * @param applicationId
 * @param xsrfToken
 * @returns result of exported AppMaker project as a string
 */
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
