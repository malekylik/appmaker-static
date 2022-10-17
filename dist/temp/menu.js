exports.isMenuOpen = false;

exports.close = function() {
  if (exports.isMenuOpen) {
    window.setTimeout( require('menu').toggle() , 400);
  }
};

exports.toggle = function() {
  exports.isMenuOpen = !exports.isMenuOpen;

  exports.applyLayout();
};

exports.applyLayout = function() {
  var menu = app.view.getDescendant('MenuWidget').children.Menu.children.sidemenu;
  var container = app.view.getDescendant('Content');

  if (exports.isMenuOpen) {
    menu.styleName = 'sidemenu menu-show';
    container.styleName = 'container shrinked';
  } else {
    menu.styleName = 'sidemenu menu-hide';
    container.styleName = 'container expanded';
  }
};

exports.getViewDisplayName = function(viewName) {
  var view = app.views[viewName];
  return view ? view.displayName : viewName;
};


exports.navigateToView = function(viewName) {
  var view = app.views[viewName];
  if (view) {
    app.view = view;
    require('menu').close();
  } else {
    require('logger').error('View "' +  viewName + '" does not exist.');
  }
};

exports.getStyleForMenuLink = function(viewName, currentViewName) {
  return currentViewName === viewName ? 'menu-item-active' : '';
};