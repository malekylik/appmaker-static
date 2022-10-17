"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeScreenshoot = exports.exportProject = exports.getXSRFToken = void 0;
const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(oldWriteFile);
function getXSRFToken(page) {
    return page.waitForSelector('input[name="xsrfToken"]')
        .then(() => page.$eval('input[name="xsrfToken"]', (input) => {
        const xsrfToken = (input.value);
        return xsrfToken;
    }));
}
exports.getXSRFToken = getXSRFToken;
function exportProject(applicationId, xsrfToken) {
    return fetch('https://appmaker.googleplex.com/_am/exportApp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: (`applicationId=${applicationId}&xsrfToken=${xsrfToken}&revisionId=`)
    })
        .then(x => x.body)
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
