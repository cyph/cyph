import {potassiumService as potassium} from '@cyph/sdk';
import memoize from 'lodash-es/memoize.js';
import tokens from './tokens.js';

export const initTokenKey = database => ({
	getTokenKey: memoize(async namespace => {
		const tokenKeyRef = database.ref(`${namespace}/tokenKey`);
		const tokenKeyHex = (await tokenKeyRef.once('value')).val();

		if (typeof tokenKeyHex === 'string') {
			return Buffer.from(tokenKeyHex, 'hex');
		}

		const tokenKeyBytes = potassium.randomBytes(await tokens.keyBytes);
		await tokenKeyRef.set(tokenKeyBytes.toString('hex'));
		return tokenKeyBytes;
	})
});
