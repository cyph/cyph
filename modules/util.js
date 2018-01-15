global.crypto	= require('crypto');

require('./buildunbundledassets');
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/util');

module.exports	= Index;
global.Index	= undefined;
