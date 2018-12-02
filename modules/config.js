require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/config');

module.exports	= new Config();
global.Config	= undefined;
