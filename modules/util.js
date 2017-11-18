global.crypto	= require('crypto');

crypto.getRandomValues = arr => {
	new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).set(
		crypto.randomBytes(arr.byteLength)
	);
	return arr;
};

require('child_process').spawnSync('bash', ['../commands/buildunbundledassets.sh']);
require('../shared/assets/js/standalone/global');
require('../shared/assets/js/cyph/util');

module.exports	= Index;
global.Index	= undefined;
