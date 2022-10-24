/* jshint esnext: true */

/**
* @param {Object} state
* @param {string} [state.headerText]
* @param {string} [state.bodyText]
* @param {string} [state.submitButtonText]
* @param {*} [state.onDelete] - function which is called on delete
*/
function setState(state = {}) {
  app.viewFragments.DialogModal.properties.headerText = state.headerText || '';
  app.viewFragments.DialogModal.properties.bodyText = state.bodyText || '';
  app.viewFragments.DialogModal.properties.submitButtonText = state.submitButtonText || '';
  app.viewFragments.DialogModal.properties.onDelete = state.onDelete;
}

exports.setState = setState;
