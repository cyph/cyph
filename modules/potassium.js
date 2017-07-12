global.crypto	= require('crypto');

crypto.getRandomValues = (arr) => {
	arr.set(crypto.randomBytes(arr.byteLength));
	return arr;
};

global.sodium	= require('libsodium-wrappers-sumo');

require('child_process').spawnSync('bash', ['../commands/buildunbundledassets.sh']);
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/crypto/potassium/index');

const potassium		= new Potassium();
potassium.potassium	= potassium;

module.exports	= potassium;
