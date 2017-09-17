require('child_process').spawnSync('bash', ['../commands/buildunbundledassets.sh']);

module.exports				= require('../shared/js/proto');

module.exports.deserialize	= async (proto, bytes) => {
	return proto.decode(bytes);
};

module.exports.serialize	= async (proto, data) => {
	const err	= proto.verify(data);
	if (err) {
		throw new Error(err);
	}
	const o	= await proto.encode(data);
	return o instanceof Uint8Array ? o : o.finish();
};
