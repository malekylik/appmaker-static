/* jshint esnext: true */

/**
* @param {number} currentSize
* @param {number} maxSize
* @returns string
*/
function getSizeLabelText(currentSize, maxSize) {
  return currentSize + '/' + maxSize;
}

function onInputChangeHandler(widget, event) {
  const currentSize = event.value.target.value.length;
  const maxSize = widget.parent.parent.properties.maxSize;

  widget.parent.children.SizeLabel.text = getSizeLabelText(currentSize, maxSize);
}

exports.getSizeLabelText = getSizeLabelText;
exports.onInputChangeHandler = onInputChangeHandler;
