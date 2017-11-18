global.crypto	= require('crypto');
global.sodium	= require('libsodium-wrappers-sumo');

require('child_process').spawnSync('bash', ['../commands/buildunbundledassets.sh', '--test']);
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/crypto/potassium');

const potassium		= new Potassium();
potassium.potassium	= potassium;

module.exports	= potassium;
global.Index	= undefined;
