global.crypto	= require('crypto');

crypto.getRandomValues = (arr) => {
	arr.set(crypto.randomBytes(arr.byteLength));
	return arr;
};

require('./js/standalone/global');
require('./js/cyph/util');

module.exports	= Index;
global.Index	= undefined;
