#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import read from 'read';
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

	await new Promise((resolve, reject) => {
		read(
			{
				prompt:
					`Press enter to continue deleting user @${username}.\n\n` +
					`NOTE: Only use this when contacted by user via verified email address ` +
					`shortly after signup. The intended use case is only to recover usernames ` +
					`from failed signup attempts, NOT to remove established accounts with ` +
					`any existing contacts.\n\n` +
					`You must also manually make an AGSEPKIIssuanceHistory exception in ` +
					`certsign.js when reissuing their cert.`
			},
			err => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			}
		);
	});

	const namespacePath = namespace.replace(/\./g, '_');

	const {auth, database, removeItem} = initDatabaseService(projectId);

	if (blockOffUsername) {
		await database
			.ref(`${namespacePath}/reservedUsernames/${username}`)
			.set('.');
	}

	await auth.deleteUser(
		(
			await auth.getUserByEmail(`${username}@${namespace}`)
		).uid
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
