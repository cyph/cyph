import crypto from 'crypto';
import memoize from 'lodash-es/memoize';
import tokens from './tokens.js';

export const initTokenKey = database => ({
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

export default initTokenKey;
