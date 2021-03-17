import {util} from '@cyph/sdk';
import functions from 'firebase-functions';
import fs from 'fs';
import {promisify} from 'util';
import {getMeta} from './base.js';
import {cyphAdminKey} from './cyph-admin-vars.js';
import {initDatabaseService} from './database-service.js';
import {initNotify} from './notify.js';
import {initTokenKey} from './token-key.js';
import {usernameBlacklist} from './username-blacklist.js';
import {validateInput} from './validation.js';

const {__dirname} = getMeta(import.meta);
const {dynamicDeserialize, dynamicSerialize, normalize} = util;

export const {
	admin,
	auth,
	database,
	getHash,
	getItem,
	getOrSetDefaultSimple,
	hasItem,
	messaging,
	pushItem,
	removeItem,
	setItem,
	setItemInternal,
	storage
} = initDatabaseService(
	{
		...functions.config(),
		fcmServerKey: (await promisify(fs.readFile)(
			__dirname + '/fcm-server-key'
		))
			.toString()
			.trim()
	},
	true
);

export const {getTokenKey} = initTokenKey(database);

export const {notify} = initNotify(database, messaging);

export const getRealUsername = async (namespace, username) => {
	if (!username) {
		return 'unregistered';
	}

	try {
		const realUsername = (await database
			.ref(`${namespace}/users/${username}/internal/realUsername`)
			.once('value')).val();
		if (realUsername) {
			return realUsername;
		}
	}
	catch (_) {}

	return username;
};

export const getName = async (namespace, username) => {
	if (!username) {
		return 'Someone';
	}

	try {
		const name = (await database
			.ref(`${namespace}/users/${username}/internal/name`)
			.once('value')).val();
		if (name) {
			return name;
		}
	}
	catch (_) {}

	return getRealUsername(namespace, username);
};

export const getSMSCredentials = async (namespace, username) => {
	try {
		if (!username) {
			return;
		}

		return (await database
			.ref(
				`${namespace.replace(
					/\./g,
					'_'
				)}/users/${username}/internal/smsCredentials`
			)
			.once('value')).val();
	}
	catch {}
};

export const getURL = (adminRef, namespace) => {
	const url = adminRef
		.toString()
		.split(
			`${adminRef.root.toString()}${namespace ? `${namespace}/` : ''}`
		)[1];

	if (!url) {
		throw new Error('Cannot get URL from input.');
	}

	return url;
};

export const isUsernameBlacklisted = async (
	namespace,
	username,
	reservedUsername
) =>
	!(reservedUsername && username === normalize(reservedUsername)) &&
	(usernameBlacklist.has(username) ||
		(await database
			.ref(`${namespace}/reservedUsernames/${username}`)
			.once('value')).exists());

export const onCall = f => async (req, res) => {
	let data;

	try {
		if (req.get('X-Warmup-Ping')) {
			res.status(200).send('');
			return;
		}

		const idToken = req.get('Authorization');
		data = dynamicDeserialize(req.body);

		const result = await f(
			data,
			validateInput(data.namespace.replace(/\./g, '_')),
			async () =>
				idToken ?
					normalize(
						(await auth.verifyIdToken(idToken)).email.split('@')[0]
					) :
					undefined,
			data.testEnvName
		);

		res.status(200).send(dynamicSerialize({result}));
	}
	catch (err) {
		console.error(err, data);
		res.status(200).send(
			dynamicSerialize({
				err: !err ? true : err.message ? err.message : err.toString()
			})
		);
	}
};

export const onRequest = (adminOnly, f) => async (req, res) => {
	try {
		if (req.get('X-Warmup-Ping')) {
			res.status(200).send('');
			return;
		}

		if (adminOnly && req.get('Authorization') !== cyphAdminKey) {
			throw new Error('Invalid authorization.');
		}

		const returnValue = await f(
			req,
			res,
			validateInput(req.body.namespace.replace(/\./g, '_'))
		);

		res.status(200).send(returnValue !== undefined ? returnValue : '');
	}
	catch (err) {
		console.error(err);
		res.status(500).send({error: true});
	}
};
