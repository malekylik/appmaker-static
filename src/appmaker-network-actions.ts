import * as puppeteer from 'puppeteer';

const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');

const writeFile = promisify(oldWriteFile);

export function getXSRFToken(page: puppeteer.Page): Promise<string> {
  return page.waitForSelector('input[name="xsrfToken"]')
    .then(() => page.$eval('input[name="xsrfToken"]', (input: any) => {
      const xsrfToken = (input.value);
  
      return xsrfToken;
    }));
}

export function exportProject (applicationId: string, xsrfToken: string): Promise<string> {
  return fetch('https://appmaker.googleplex.com/_am/exportApp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: (`applicationId=${applicationId}&xsrfToken=${xsrfToken}&revisionId=`) })
  .then(x => x.body)
  .then((rb) => {
    const reader = rb!.getReader();

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
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject('Error occurred while reading binary string');
  }));
}

export function takeScreenshoot(page: puppeteer.Page, path = (__dirname + '/screenshot.png')): Promise<void> {
  return page.screenshot({ type: 'png', fullPage: true, captureBeyondViewport: true })
    .then((screenshot) => writeFile(path, screenshot));
}
