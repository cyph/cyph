require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/config');
require('../shared/assets/js/cyph/plan-config');

module.exports = new Config();
module.exports.planConfig = planConfig;
module.exports.config = module.exports;
global.Config = undefined;
global.planConfig = undefined;
