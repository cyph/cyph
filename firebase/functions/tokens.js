const msgpack = require('msgpack-lite');
const potassium = require('./potassium');

module.exports = {
	keyBytes: potassium.secretBox.keyBytes,
	create: async (payload = {}, expiresIn = 0, key) =>
		Buffer.from(
			await potassium.secretBox.seal(
				msgpack.encode({...payload, expires: Date.now() + expiresIn}),
				key
			)
		).toString('hex'),
	open: async (token, key) => {
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
	}
};
