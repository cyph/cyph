require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/config');

module.exports			= new Config();
module.exports.config	= module.exports;
global.Config			= undefined;
