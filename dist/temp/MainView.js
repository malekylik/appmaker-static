/* jshint esnext: true */

const { promosifyClientCall } = require('ClientUtils');
const { openProcessViewPageHandler } = require('ProcessViewClient');

const { isElementOfParent } = require('DOM');

const createProcess = promosifyClientCall((...args) => app.datasources.Process.create(...args));

function getEditButton(panel) {
  return panel.descendants._values.get(8);
}

function onItemClickHandler(widget, event) {
  openProcessViewPageHandler(widget);

  var isClickedOnEditButton = isElementOfParent(getEditButton(widget).getElement(), event.srcElement);

  if (!isClickedOnEditButton) {
    openProcessViewPageHandler(widget);
    app.view = app.views.ProcessView;
  }
}

function onAddProcessHandler(widget) {
  const form = widget.root.descendants.Form;

  if (form.validate()) {
    widget.enabled = false;

    createProcess()
      .then(() => {
        widget.enabled = true;

        app.closeDialog();
      });
  }
}

exports.onItemClickHandler = onItemClickHandler;
exports.onAddProcessHandler = onAddProcessHandler;
