exports.RiskDriverSubCategory = {
  'Financial': [
    'Revenue Loss/Expense',
    'Financial Reporting'
  ],
  'Operational': [
    'Volumetric Drivers',
    'Regional Impact',
    'System Disruption',
    'Data Management'
  ],
  'Reputational': [
    'Press sentiment',
    'Customer Satisfaction'
  ],
  'Legal / Complicance': [
    'Legal / Regulatory Compliance',
    'Regulatory Scrutinyn with list of categories to be confirmed by PGA'
  ],
  'No selection': []
};

exports.onSelectRiskDriverCategory = function(widget) {
  widget.root.descendants.RiskDriverSubCategoryFieldInput2.value = 'No selection';
};