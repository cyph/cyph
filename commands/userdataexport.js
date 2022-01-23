#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import fs from 'fs';
import {initDatabaseService} from '../modules/database-service.js';
import {getUserMetadata} from './getusermetadata.js';

const {dynamicDeserialize, dynamicSerializeBytes} = util;

export const userDataExport = async (projectId, namespace) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	const {database} = initDatabaseService(projectId);
	const namespacePath = namespace.replace(/\./g, '_');

	const usersPath = `${__dirname}/../users.processed`;
	const usersExists = fs.existsSync(usersPath);

	const users = usersExists ?
		dynamicDeserialize(fs.readFileSync(usersPath)) :
		await (async () => {
			const rawUsersPath = `${__dirname}/../users.json`;
			const rawUsersExists = fs.existsSync(rawUsersPath);

			const rawUsers = rawUsersExists ?
					JSON.parse(fs.readFileSync(rawUsersPath).toString()) :
					(
						await database
							.ref(`${namespacePath}/users`)
							.once('value')
					).val();

			if (rawUsersExists) {
				console.error('using cached users.json');
			}
			else {
				console.error('caching user data at users.json');
				fs.writeFileSync(rawUsersPath, JSON.stringify(rawUsers));
			}

			return Promise.all(
				Array.from(Object.entries(rawUsers)).map(
					async ([username, user]) =>
						getUserMetadata(
							projectId,
							{
								...user,
								username
							},
							namespace,
							true
						)
				)
			);
		})();

	if (usersExists) {
		console.error('using cached users.processed');
	}
	else {
		console.error('caching processed user data at users.processed');
		fs.writeFileSync(usersPath, dynamicSerializeBytes(users));
	}

	console.error('\n');

	return users;
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const namespace = process.argv[3];

		await userDataExport(projectId, namespace);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
