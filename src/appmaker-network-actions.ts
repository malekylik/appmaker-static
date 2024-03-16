import * as puppeteer from 'puppeteer';

import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';

const { writeFile: oldWriteFile } = require('fs');
const { promisify } = require('util');

const writeFile = promisify(oldWriteFile);

// Status Code: 302 means need to relogin
// POST https://spotlight-dev-sprabahar.googleplex.com/_api/base/app_data/v1/query_records 412 - reload required

function toUtfStr(str: string): string {
  let end = ''

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\') {
      if (str[i + 1] === 'x') {
        const escape = str.slice(i, i + 4);

        if (escape[2] === '2' && escape[3] === '2') {
          end += '"';
        } else if (escape[2] === '7' && escape[3] === 'b') {
          end += '{';
        } else if (escape[2] === '7' && escape[3] === 'd') {
          end += '}';
        } else {
          end += escape;

          console.warn('unknown escape seq', escape);
        }

        i += 3;
      } else {
        console.warn('unknown escape char', i + 1, str[i + 1]);
      }
    } else {
      end = end + str[i];
    }
  }

  return end;
}


// key for importing project
// fetch('https://appmaker.googleplex.com/_api/base/upload/v1/generate_file_upload_key', { method: 'POST', headers: { 'x-framework-xsrf-token': 'X1d1M1hhdVQ1akV4NGVDSWdldlJraHZhSmJqblJPSlpMYmZnSzlXVnhBMHwxNjY2Mjc2NzUyMTA0' } }).then((r) => r.json()).then(r => logger.log(r))

// command used for updating app
// fetch('https://appmaker.googleplex.com/_api/editor/application_editor/v1/retrieve_commands', { method: 'POST', headers: { 'x-framework-xsrf-token': 'X1d1M1hhdVQ1akV4NGVDSWdldlJraHZhSmJqblJPSlpMYmZnSzlXVnhBMHwxNjY2Mjc2NzUyMTA0', 'content-type': 'application/jspblite2' }, body: JSON.stringify({"1":"RdeRXXpJpD", "2":"21621"}) }).then((r) => r.json()).then(r => logger.log(r))

export async function getClientEnvironment(page: puppeteer.Page): Promise<{ initialXsrfToken: string }> {
  const resultHandle = await page.evaluateHandle(() => (window as any).clientEnvironment);
  const clientEnvironment = await resultHandle.jsonValue();

  resultHandle.dispose();

  return Promise.resolve(clientEnvironment);
}

export async function getXSRFToken(page: puppeteer.Page): Promise<string> {
  const clientEnvironment = await getClientEnvironment(page);

  return clientEnvironment.initialXsrfToken;
}

export async function getCommandNumberFromApp(page: puppeteer.Page) {
  const lastPart = await page.evaluate(() => {
    const script = document.body.children[0] as HTMLScriptElement;
    const lastPart = script.innerText.slice(script.innerText.length - 100, script.innerText.length);

    return lastPart;
  });

  const commandId = toUtfStr(lastPart).match(/"2":"(\d+)"}/)?.[1];

  if (!commandId) {
    throw new Error('Cannot get command id');
  }

  return commandId;
}

enum CommnadId {
  paste = 22,
}

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

export const isRequestResponse = (response: unknown): response is RequestResponse =>
  response !== null && typeof response === 'object' && 'response' in response && Array.isArray(response.response);

export const isCommandLikeResponse = (response: unknown): response is CommnadLikeResponse =>
  response !== null && typeof response === 'object' && 'sequenceNumber' in response;

export const isRequestChangeScriptCommand = (response: unknown): response is ChangeScriptCommand =>
  response !== null && typeof response === 'object' && 'changeScriptCommand' in response;
export const isRequestAddComponentInfoCommand = (response: unknown): response is AddComponentInfoCommand =>
  response !== null && typeof response === 'object' && 'addComponentInfoCommand' in response;


export const isRequestError = (response: unknown): response is RequestError =>
  response !== null && typeof response === 'object' && 'type' in response && 'message' in response;

export const tryToGetCommandName = (response: Record<string, unknown>): O.Option<string> =>
  pipe(
    Object.keys(response),
    keys => keys
    .map(key => key.match(/\w*Command$/) || [])
    .map(m => m[0])
    .filter(key => key !== undefined),
    findCommandKey => findCommandKey.length > 1 ? O.none : O.some(findCommandKey[0]!)
  );

export const tryToGetCommand = (response: Record<string, unknown>): O.Option<CommnadLikeResponse> =>
  pipe(
    tryToGetCommandName(response),
    O.chain(key => response[key || ''] ? O.some(response[key || '']) : O.none),
    O.chain(command => command && isCommandLikeResponse(command) ? O.some(command) : O.none)
  );

export type CommnadLikeResponse = {
  sequenceNumber: string;
};

export type AddComponentInfoCommand = {
  addComponentInfoCommand: {
    //TODO: fill

    sequenceNumber: string;
  }
};

export type ScriptModifiaction = {
  length: number; text: string; type: 'DELETE' | 'INSERT'
} | { length: number; type: 'SKIP' };

export type ChangeScriptCommand = {
  changeScriptCommand: {
    key: { applicationKey: string; localKey: string; };
    scriptChange: {
      lengthAfter: number;
      lengthBefore: number;
      modifications: Array<ScriptModifiaction>;
    };
    sequenceNumber: string;
  }
};

export type RequestResponse = { response: Array<AddComponentInfoCommand | ChangeScriptCommand> };
export type RequestError = { type: string; message: string; unknownException?: { exceptionTypeName: 'UNKNOWN_EXCEPTION' } };

export async function retrieveCommands(page: puppeteer.Page, xsrfToken: string, appKey: string, currentCommandNumber: string) {
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
      const reader = rb!.getReader();
  
      return new ReadableStream({
        start(controller) {
          // The following function handles each data chunk
          function push() {
            // "done" is a Boolean and value a "Uint8Array"
            reader.read().then(({ done, value }) => {
              // If there is no more data to read
              if (done) {
                controller.close();
                return;
              }
              // Get the data and send it to the browser via the controller
              controller.enqueue(value);
              // Check chunks by logging to the console
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
  }, xsrfToken, appKey, currentCommandNumber) as string;

  const parsedRes: RequestResponse | RequestError = JSON.parse(res);

  return parsedRes;
}

export async function changeScriptFile(page: puppeteer.Page, xsrfToken: string, appId: string, login: string, fileKey: string, commandNumber: string, prevContent: string, content: string) {
  const body = {
    "1": `${login}:-65675019:1709725791108`, // dont know numbers
    "2": {
      "22": {
        "1": {
          "1": appId,
          "2": { "1": fileKey }
      },
      "2": { "1": content.length, "2": prevContent.length,
        "3":[
          {
          "1": prevContent.length,
          "2": {"1":prevContent}, "3":3}, { "1":content.length, "2":{ "1":content }, "3":2}]}, "3":"0" }
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
      const reader = rb!.getReader();
  
      return new ReadableStream({
        start(controller) {
          // The following function handles each data chunk
          function push() {
            // "done" is a Boolean and value a "Uint8Array"
            reader.read().then(({ done, value }) => {
              // If there is no more data to read
              if (done) {
                controller.close();
                return;
              }
              // Get the data and send it to the browser via the controller
              controller.enqueue(value);
              // Check chunks by logging to the console
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
  }, xsrfToken, JSON.stringify(body)) as string;

  type RequestResponse = { response: Array<{ changeScriptCommand: {
    key: { applicationKey: string; localKey: string; };
    scriptChange: {
      lengthAfter: number;
      lengthBefore: number;
      modifications: Array<{ length: number; text: string; type: 'DELETE' | 'INSERT' }>;
    };
    sequenceNumber: string;
  } }> };
  type RequestError = { type: string; message: string; };

  const parsedRes: RequestResponse | RequestError = JSON.parse(res);

  return parsedRes;
}

/**
 * @param applicationId
 * @param xsrfToken
 * @returns result of exported AppMaker project as a string
 */
export function exportProject (applicationId: string, xsrfToken: string): Promise<string> {
  return fetch('https://appmaker.googleplex.com/_am/exportApp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: (`applicationId=${applicationId}&xsrfToken=${xsrfToken}&revisionId=`) })
  .then(r => r.body)
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
              controller.close();
              return;
            }
            // Get the data and send it to the browser via the controller
            controller.enqueue(value);
            // Check chunks by logging to the console
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
