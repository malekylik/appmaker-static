/* jshint esnext: true */

const promosifyServerCall = require('ServerUtils').promosifyServerCall;

/**
* @param {Array<string>} recipients - email body text to transform
* @returns string
*/
function getEmailRecipients(recipients) {
  return recipients.join(',');
}

/**
* @param {string} text - email body text to transform
* @param {Object} options - options for transforming text
* @param {string} [options.color]
* @param {string} [options.font]
* @param {number} [options.size]
*/
function getEmailBody(text, options = {}) {
  const color = options.color || '#212121';
  const font = options.font || 'Arial';
  const size = options.size || 2;

  return text.split('\n').map((line) => {
    if (line === '') {
      return (`<div><font color="${color}" face="${font}" size="${size}"><br></font></div>`);
    }

    return (`<div><font color="${color}" face="${font}" size="${size}">${line}</font></div>`);
  }).join('\n');
}

/**
* @param {Array<String>} to - list of email
* @param {string} title
* @param {string} body
*/
function executeSendEmail(to, title, body) {
  return promosifyServerCall('NotificationServer', 'sendEmail')([getEmailRecipients(to), title, body]);
}

exports.executeSendEmail = executeSendEmail;
exports.getEmailBody = getEmailBody;