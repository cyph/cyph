/**
 * @file Simple implementation of subset of FirebaseDatabaseService logic for interoperability.
 */


const gcloudStorage					= require('@google-cloud/storage');
const admin							= require('firebase-admin');
const functions						= require('firebase-functions');
const potassium						= require('./potassium');
const {BinaryProto, StringProto}	= require('./proto');

const {
	deserialize,
	retryUntilSuccessful,
	serialize,
	uuid
}	= require('./util');


module.exports	= config => {


const app			= admin.initializeApp(config.firebase, uuid());
const auth			= app.auth();
const database		= app.database();
const functionsUser	= functions.auth.user();
const storage		= gcloudStorage(config.storage).bucket(`${config.project.id}.appspot.com`);

const processURL	= (namespace, url) =>
	`/${namespace.replace(/\./g, '_')}/${url.replace(/^\//, '')}`
;

return {
	app,
	auth,
	database,
	functionsUser,
	async getItem (namespace, url, proto) {
		url	= processURL(namespace, url);

		const {hash}	= await retryUntilSuccessful(async () =>
			(await database.ref(url).once('value')).val()
		);

		const bytes		= await retryUntilSuccessful(async () =>
			(await storage.file(url).download())[0]
		);

		if (
			!potassium.compareMemory(
				potassium.fromBase64(hash),
				await potassium.hash.hash(bytes)
			)
		) {
			throw new Error('Invalid data hash.');
		}

		return deserialize(proto, bytes);
	},
	async hasItem (namespace, url) {
		try {
			await this.getItem(namespace, url, BinaryProto);
			return true;
		}
		catch (_) {
			return false;
		}
	},
	async removeItem (namespace, url) {
		url	= processURL(namespace, url);

		return retryUntilSuccessful(async () => Promise.all([
			database.ref(url).remove(),
			storage.deleteFiles({force: true, prefix: `${url}/`})
		]));
	},
	async setItem (namespace, url, proto, value) {
		url	= processURL(namespace, url);

		const bytes	= await serialize(proto, value);

		await retryUntilSuccessful(async () => storage.file(url).save(bytes));
		await retryUntilSuccessful(async () => database.ref(url).set({
			hash: potassium.toBase64(await potassium.hash.hash(bytes)),
			timestamp: admin.database.ServerValue.TIMESTAMP
		}));
	},
	storage
};


};
