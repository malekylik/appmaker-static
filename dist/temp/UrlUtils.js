/* jshint esnext: true */

function serializeUrlParams(params = {}) {
  const res = Object.entries(params).map((entry) => entry[0] + '=' + entry[1], '').join('&');

  return res.length === 0 ? res : '?' + res;
}

function getUrlOfView(view, params) {
  return `${window.location.origin}${window.location.pathname}${serializeUrlParams(params)}#${view.name}`;
}

exports.getUrlOfView = getUrlOfView;
exports.serializeUrlParams = serializeUrlParams;
