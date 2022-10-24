/* jshint esnext: true */

const { openProcessViewPageHandler } = require('ProcessViewClient');


function onTaskClickHandler(widget) {
  openProcessViewPageHandler(widget);
}

exports.onTaskClickHandler = onTaskClickHandler;
