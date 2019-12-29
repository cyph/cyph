const crypto = require('crypto');
const memoize = require('lodash/memoize');
const tokens = require('./tokens');

module.exports = database => ({
	getTokenKey: memoize(async namespace => {
		const tokenKeyRef = database.ref(`${namespace}/tokenKey`);
		const tokenKeyHex = (await tokenKeyRef.once('value')).val();

		if (typeof tokenKeyHex === 'string') {
			return Buffer.from(tokenKeyHex, 'hex');
		}

		const tokenKeyBytes = crypto.randomBytes(await tokens.keyBytes);
		await tokenKeyRef.set(tokenKeyBytes.toString('hex'));
		return tokenKeyBytes;
	})
});
