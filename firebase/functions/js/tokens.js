import {potassiumService as potassium} from '@cyph/sdk';
import msgpack from 'msgpack-lite';

export const keyBytes = potassium.secretBox.keyBytes;

export const create = async (
	payload = {},
	key,
	expiresIn = 3600000,
	expiryPadding = 1800000
) => {
	const expires = Date.now() + expiresIn;

	return {
		expires: expires - expiryPadding,
		token: Buffer.from(
			await potassium.secretBox.seal(
				msgpack.encode({...payload, expires}),
				key
			)
		).toString('hex')
	};
};

export const open = async (token, key) => {
	const payload = msgpack.decode(
		await potassium.secretBox.open(Buffer.from(token, 'hex'), key)
	);

	if (
		typeof payload !== 'object' ||
		typeof payload.expires !== 'number' ||
		isNaN(payload.expires) ||
		Date.now() > payload.expires
	) {
		throw new Error('Expired token.');
	}

	return payload;
};
