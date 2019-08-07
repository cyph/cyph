global.crypto = require('crypto');

require('./js/standalone/global');
require('./js/cyph/config');

module.exports = new Config();
module.exports.config = module.exports;
global.Config = undefined;
