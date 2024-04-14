# appmaker-static

A tool to improve developer experience on working with AppMaker. Uses Headless Chrome and Puppeteer to communicate with AppMaker server.
<br>
<code>headless?: boolean</code> arg can be passed to control if Headless Chrome should be run in headless mode. Note: not every mode supports this arg.

## appmaker-static config
Place a json file with the name _appmaker-static.config.json_ in the root folder. The config should contain an object with the following properties:
<ul>
    <li><code>browserConfigPath: string</code> - The path to a folder which is used by the headless chrome to cache its data</li>
    <li><code>password?: string</code> - The user password to avoid typing it in the console</li>
</ul>

## appmaker-static modes

There are several modes the tool can be run with:
<ul>
    <li><code>offline</code></li>
    <li><code>remote</code></li>
    <li><code>interactive</code></li>
</ul>

The <code>--mode</code> arg can be passed to run the tool with the specific mode.

### offline

Runs ESLint with <code>--fix</code> arg and TypeScript over the provided AppMaker project. Displays the output from ESLint and TypeScript to the prompt.
<br>
The result is archived to <code>app.zip</code> file.
<br>
<br>
Supported args:
<ul>
    <li><code>project: string</code> - The path to the AppMaker project. Can be a zip archive or a folder.</li>
    <li><code>outDir: string</code> - The path to folder for the output <code>app.zip</code> file. Also used to store temporary files during execution of the tool. Make sure the folder doesn't contain any valuable files since they will be removed.</li>
</ul>


### remote

### interactive
