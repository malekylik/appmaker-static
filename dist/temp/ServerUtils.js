
/* jshint esnext: true */

exports.promosifyServerCall = (serverModule, serverFunc) => (args) => new Promise((res, rej) => {
  app.executeRemoteScript(
    serverModule,
    serverFunc,
    args,
    {
      success: res,
      failure: rej,
    }
  );
});