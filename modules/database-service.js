/**
 * @file Simple implementation of subset of FirebaseDatabaseService logic for interoperability.
 */

const {Storage} = require('@google-cloud/storage');
const crypto = require('crypto');
const admin = require('firebase-admin');
const fs = require('fs');
const lz4 = require('lz4');
const os = require('os');
const {BinaryProto} = require('./proto');

const {
	deserialize,
	retryUntilSuccessful,
	serialize,
	sleep,
	uuid
} = require('./util');

/** Max number of bytes to upload to non-blob storage. */
const nonBlobStorageLimit = 8192;

module.exports = (config, isCloudFunction) => {
	if (typeof config === 'string') {
		const projectId = config;
		const configDir = `${os.homedir()}/.cyph`;
		const keyFilename = `${configDir}/firebase-credentials/${projectId}.json`;

		config = {
			firebase: {
				credential: admin.credential.cert(
					JSON.parse(fs.readFileSync(keyFilename).toString())
				),
				databaseURL: `https://${projectId}.firebaseio.com`
			},
			project: {id: projectId},
			storage: {keyFilename, projectId}
		};
	}

	const app = admin.initializeApp(config.firebase, uuid());
	const auth = app.auth();
	const database = app.database();
	const messaging = app.messaging();
	const storage = new Storage(config.storage).bucket(
		`${config.project.id}.appspot.com`
	);

	const processURL = (namespace, url) => {
		if (!namespace || !url) {
			throw new Error('Invalid URL.');
		}

		return `${namespace.replace(/\./g, '_')}/${url.replace(/^\//, '')}`;
	};

	const getHash = bytes =>
		crypto
			.createHash('sha512')
			.update(bytes)
			.digest('hex');

	const retry = async f =>
		retryUntilSuccessful(async lastErr => {
			if (lastErr) {
				console.error(lastErr);
			}

			return Promise.race([
				f(),
				sleep(600000).then(() =>
					Promise.reject('Database method timeout.')
				)
			]);
		});

	const databaseService = {
		admin,
		app,
		auth,
		database,
		getHash,
		messaging,
		processURL,
		async getItem (namespace, url, proto, skipSignature, decompress)  {
			url = processURL(namespace, url);

			const {data, hash} = await retry(async () =>
				(await database.ref(url).once('value')).val()
			);

			let bytes = data ?
				Buffer.from(data, 'base64') :
				await retry(
					async () =>
						(await storage.file(`${url}/${hash}`).download())[0]
				);
			if (skipSignature) {
				bytes = bytes.slice(41256);
			}
			if (decompress) {
				bytes = lz4.decode(bytes);
			}

			return deserialize(proto, bytes);
		},
		async hasItem (namespace, url)  {
			try {
				await databaseService.getItem(namespace, url, BinaryProto);
				return true;
			}
			catch (_) {
				return false;
			}
		},
		async removeItem (namespace, url)  {
			url = processURL(namespace, url);

			if (isCloudFunction) {
				await Promise.all([
					database.ref(url).remove(),
					storage
						.deleteFiles({force: true, prefix: `${url}/`})
						.catch(() => {})
				]);
			}
			else {
				await retry(async () => database.ref(url).remove());
			}
		},
		async setItem (namespace, url, proto, value)  {
			return databaseService.setItemInternal(
				processURL(namespace, url),
				await serialize(proto, value)
			);
		},
		async setItemInternal (url, value, hash, dataAlreadySet)  {
			const [bytes, bytesBase64] =
				typeof value === 'string' ?
					[Buffer.from(value, 'base64'), value] :
					[value, value.toString('base64')];
			const noBlobStorage = bytes.length <= nonBlobStorageLimit;

			if (hash === undefined) {
				hash = getHash(bytes);
			}

			if (!noBlobStorage) {
				await retry(async () =>
					storage.file(`${url}/${hash}`).save(bytes)
				);
			}
			else if (dataAlreadySet) {
				return;
			}

			await retry(async () =>
				database.ref(url).set({
					hash,
					timestamp: admin.database.ServerValue.TIMESTAMP,
					...(!noBlobStorage ?
						{} :
						{
							data: bytesBase64
						})
				})
			);
		},
		storage
	};

	return databaseService;
};
