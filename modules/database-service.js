/**
 * @file Simple implementation of subset of FirebaseDatabaseService logic for interoperability.
 */


const gcloudStorage	= require('@google-cloud/storage');
const admin			= require('firebase-admin');
const functions		= require('firebase-functions');
const potassium		= require('./potassium');
const {StringProto}	= require('./proto');
const {uuid}		= require('./util');

const {
	deserialize,
	retryUntilSuccessful,
	serialize
}	= require('./util');


module.exports	= config => {


const app			= admin.initializeApp(config.firebase, uuid());
const auth			= app.auth();
const database		= app.database();
const functionsUser	= functions.auth.user();
const storage		= gcloudStorage(config.storage).bucket(`${config.project.id}.appspot.com`);

return {
	app,
	auth,
	database,
	functionsUser,
	getItem: async (namespace, url, proto) => {
		url	= `/${namespace}/${url.replace(/^\//, '')}`;

		const {hash}	= (await database.ref(url).once('value')).val();
		const bytes		= (await storage.file(url).download())[0];

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
	removeItem: async (namespace, url) => {
		url	= `/${namespace}/${url.replace(/^\//, '')}`;

		return retryUntilSuccessful(async () => Promise.all([
			database.ref(url).remove(),
			storage.deleteFiles({force: true, prefix: `${url}/`})
		]));
	},
	setItem: async (namespace, url, proto, value) => {
		url	= `/${namespace}/${url.replace(/^\//, '')}`;

		const bytes	= await serialize(proto, value);

		await storage.file(url).save(bytes);
		await database.ref(url).set({
			hash: potassium.toBase64(await potassium.hash.hash(bytes)),
			timestamp: admin.database.ServerValue.TIMESTAMP
		});
	},
	storage
};


};
