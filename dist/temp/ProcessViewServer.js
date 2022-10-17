var dataService = require('dataService');

exports.hasControls = function(riskId) {
  var records = dataService.queryRecords({
    model: 'Controls',
    filters: {
      RiskID: {eq: riskId},
    },
  }).getRecords();

  return records.length > 0;
};