/* jshint esnext: true */

const { isElementOfParent } = require('DOM');

function getEditButton(panel, widget) {
  return panel.descendants._values.get(8);
}

function onItemClickHandler(widget, event) {
  var datasource = widget.datasource;
  var clickedProcessItemIndex = app.datasources.Process.items.toArray().findIndex(function(item) { return item.ProcessID === datasource.item.ProcessID; });
  app.datasources.Process.itemIndex = clickedProcessItemIndex !== -1 ? clickedProcessItemIndex : app.datasources.Process.itemIndex;
  app.datasources.ProcessInfoByID.properties.ProcessID = clickedProcessItemIndex !== -1 ? app.datasources.Process.items.get(clickedProcessItemIndex).ProcessID : null;
  app.datasources.ProcessInfoByID.item = null;
  app.datasources.RiskAssessmentByID.query.parameters.RAID = datasource.item.RAID;
  app.datasources.RiskAssessmentByID.item = null;
  
  var isClickedOnEditButton = isElementOfParent(getEditButton(widget).getElement(), event.srcElement);

  if (!isClickedOnEditButton) {
    app.view = app.views.ProcessView;
  }
}

exports.onItemClickHandler = onItemClickHandler;
