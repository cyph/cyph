const crypto = require('crypto');
const memoize = require('lodash/memoize');

module.exports = database => ({
	getJwtKey: memoize(async namespace => {
		const jwtKeyRef = database.ref(`${namespace}/jwtKey`);
		const jwtKeyHex = (await jwtKeyRef.once('value')).val();

		if (typeof jwtKeyHex === 'string') {
			return Buffer.from(jwtKeyHex, 'hex');
		}

		const jwtKeyBytes = crypto.randomBytes(32);
		await jwtKeyRef.set(jwtKeyBytes.toString('hex'));
		return jwtKeyBytes;
	})
});
