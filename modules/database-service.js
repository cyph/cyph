/**
 * @file Simple implementation of subset of FirebaseDatabaseService logic for interoperability.
 */


const gcloudStorage					= require('@google-cloud/storage');
const crypto						= require('crypto');
const admin							= require('firebase-admin');
const functions						= require('firebase-functions');
const lz4							= require('lz4');
const os							= require('os');
const {BinaryProto, StringProto}	= require('./proto');

const {
	deserialize,
	retryUntilSuccessful,
	serialize,
	uuid
}	= require('./util');


module.exports	= (config, isCloudFunction) => {


if (typeof config === 'string') {
	const projectId		= config;
	const configDir		= `${os.homedir()}/.cyph`;
	const keyFilename	= `${configDir}/firebase-credentials/${projectId}.json`;

	config	= {
		firebase: {
			credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyFilename).toString())),
			databaseURL: `https://${projectId}.firebaseio.com`
		},
		project: {id: projectId},
		storage: {keyFilename, projectId}
	};
}


const app			= admin.initializeApp(config.firebase, uuid());
const auth			= app.auth();
const database		= app.database();
const functionsUser	= functions.auth.user();
const messaging		= app.messaging();
const storage		= gcloudStorage(config.storage).bucket(`${config.project.id}.appspot.com`);

const processURL	= (namespace, url) => {
	if (!namespace || !url) {
		throw new Error('Invalid URL.');
	}

	return `${namespace.replace(/\./g, '_')}/${url.replace(/^\//, '')}`;
};

const databaseService	= {
	app,
	auth,
	database,
	functionsUser,
	messaging,
	async getItem (namespace, url, proto, skipSignature, decompress) {
		url	= processURL(namespace, url);

		const {hash}	= await retryUntilSuccessful(async () =>
			(await database.ref(url).once('value')).val()
		);

		let bytes		= await retryUntilSuccessful(async () =>
			(await storage.file(`${url}/${hash}`).download())[0]
		);

		if (skipSignature) {
			bytes	= bytes.slice(41256);
		}
		if (decompress) {
			bytes	= lz4.decode(bytes);
		}

		return deserialize(proto, bytes);
	},
	async hasItem (namespace, url) {
		try {
			await databaseService.getItem(namespace, url, BinaryProto);
			return true;
		}
		catch (_) {
			return false;
		}
	},
	async removeItem (namespace, url) {
		url	= processURL(namespace, url);

		await retryUntilSuccessful(async () => database.ref(url).remove());

		if (isCloudFunction) {
			await retryUntilSuccessful(async () =>
				storage.deleteFiles({force: true, prefix: `${url}/`})
			);
		}
	},
	async setItem (namespace, url, proto, value) {
		url	= processURL(namespace, url);

		const bytes	= await serialize(proto, value);
		const hash	= crypto.createHash('sha512').update(bytes).digest('hex');

		await retryUntilSuccessful(async () => storage.file(`${url}/${hash}`).save(bytes));
		await retryUntilSuccessful(async () => database.ref(url).set({
			hash,
			timestamp: admin.database.ServerValue.TIMESTAMP
		}));
	},
	storage
};

return databaseService;


};
