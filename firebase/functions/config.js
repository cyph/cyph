global.crypto = require('crypto');

require('./js/standalone/global');
require('./js/cyph/config');
require('./js/cyph/plan-config');

module.exports = new Config();
module.exports.planConfig = planConfig;
module.exports.config = module.exports;
global.Config = undefined;
global.planConfig = undefined;
