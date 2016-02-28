var helpers = {};

helpers.pad = function(num, len) {
    return ("000000000000000" + num).slice(-len);
};

helpers.escape = function(message) {
    return message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

module.exports = helpers;