/**
 * Sends an email with given subject and body to the recipient
 * @param {string} recipient an email address of the recipient
 * @param {string} subject an email subject text
 * @param {string} body an email html body text
 */
exports.sendEmail = function(recipient, subject, body) {
  var sender = require('userProvider').get().email;

  var EmailMessage = require('mail').EmailMessage;
  new EmailMessage({
    sender: sender,
    to: recipient,
    subject: subject,
    html: body
  }).send();
};
