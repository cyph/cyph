#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import cyphPrettier from '@cyph/prettier';
import {util} from '@cyph/sdk';
import fs from 'fs';
import jp from 'jsonpath';
import path from 'path';
import {read} from 'read';
import {initDatabaseService} from '../modules/database-service.js';

const {normalize} = util;

export const deleteUser = async (
	projectId,
	namespace,
	username,
	blockOffUsername = true
) => {
	username = normalize(username);

	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}
	if (!username) {
		throw new Error('Invalid username.');
	}

	await read({
		prompt:
			`Press enter to continue deleting user @${username}.\n\n` +
			`NOTE: Only use this when contacted by user via verified email address ` +
			`shortly after signup. The intended use case is only to recover usernames ` +
			`from failed signup attempts, NOT to remove established accounts with ` +
			`any existing contacts.\n\n` +
			`You must also manually make an AGSEPKIIssuanceHistory exception in ` +
			`certsign.js when reissuing their cert.`
	});

	const namespacePath = namespace.replace(/\./g, '_');

	const {auth, database, removeItem, setArchive, storageGetItem} =
		initDatabaseService(projectId);

	const user = (
		await database.ref(`${namespacePath}/users/${username}`).once('value')
	).val();

	const userDataPaths = jp
		.paths(user, '$..hash')
		.map(p => p.slice(1, -1))
		.map(p => ({
			parentObject: p.reduce((v, k) => v[k], user),
			url: `users/${username}/${p.join('/')}`
		}))
		.filter(o => typeof o.parentObject.hash === 'string');

	for (const {parentObject, url} of userDataPaths) {
		if (parentObject.data) {
			continue;
		}

		console.log(`Getting ${namespacePath}/${url}/${parentObject.hash}.`);

		try {
			parentObject.data = (
				await storageGetItem(namespace, url, parentObject.hash)
			).toString('base64');
		}
		catch (err) {
			console.error(err);

			if (
				(
					await read({
						prompt: 'An error has occurred. Ignore it and resume the backup/deletion? [y/N]'
					})
				)
					.trim()
					.toLowerCase() !== 'y'
			) {
				throw err;
			}
		}
	}

	const accountBackupsDir = path.join(__dirname, '..', 'account-backups');
	const packageJSON = JSON.parse(
		fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString()
	);
	const userJSON = JSON.stringify(user);

	if (!fs.existsSync(accountBackupsDir)) {
		fs.mkdirSync(accountBackupsDir);
	}
	fs.writeFileSync(
		path.join(accountBackupsDir, `${username}@${namespace}.json`),
		cyphPrettier.format(userJSON, {
			...packageJSON.prettier,
			parser: 'json'
		})
	);
	console.log(
		`Saved user data backup to account-backups/${username}@${namespace}.json.`
	);

	if (projectId === 'cyphme') {
		console.log('Uploading backup archive.');
		const backupTimestamp = await setArchive(
			`account-backups/${username}@${namespace}`,
			userJSON
		);
		console.log(
			`Finished uploading account-backups/${username}@${namespace}/${backupTimestamp.toString()}.`
		);
	}

	if (blockOffUsername) {
		await database
			.ref(`${namespacePath}/reservedUsernames/${username}`)
			.set('.');
	}

	await auth.deleteUser(
		(await auth.getUserByEmail(`${username}@${namespace}`)).uid
	);

	await removeItem(namespace, `users/${username}`, true);

	console.log(`Deleted @${username}.`);
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const namespace = process.argv[3];
		const username = process.argv[4];

		await deleteUser(projectId, namespace, username);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
