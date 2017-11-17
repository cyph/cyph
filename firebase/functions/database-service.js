/**
 * @file Simple implementation of subset of FirebaseDatabaseService logic for interoperability.
 */


const gcloudStorage				= require('@google-cloud/storage');
const admin						= require('firebase-admin');
const functions					= require('firebase-functions');
const potassium					= require('./potassium');
const {StringProto}				= require('./proto');

const {
	deserialize,
	retryUntilSuccessful,
	serialize
}	= require('./util');

admin.initializeApp(functions.config().firebase);

const auth			= admin.auth();
const database		= admin.database();
const functionsUser	= functions.auth.user();
const storage		= gcloudStorage().bucket(`${functions.config().project.id}.appspot.com`);


module.exports	= {
	auth,
	database,
	functionsUser,
	getItem: async (url, proto) => {
		const {hash}	= (await database.ref(url).once('value')).val();
		const value		= (await storage.file(url).download())[0];

		if (
			!potassium.compareMemory(
				potassium.fromBase64(hash),
				await potassium.hash.hash(value)
			)
		) {
			throw new Error('Invalid data hash.');
		}

		return deserialize(proto, value);
	},
	removeItem: async url => {
		return retryUntilSuccessful(async () => Promise.all([
			database.ref(url).remove(),
			storage.deleteFiles({force: true, prefix: `${url}/`})
		]));
	},
	setItem: async (url, proto, value) => {
		return Promise.all([
			storage.file(url).save(serialize(proto, value)),
			database.ref(url).set({
				hash: potassium.toBase64(await potassium.hash.hash(fullCert)),
				timestamp: admin.database.ServerValue.TIMESTAMP
			})
		]);
	},
	storage
};
