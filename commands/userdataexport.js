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

	const inviteCodes = await (async () => {
		const inviteCodesPath = `${__dirname}/../invite-codes.json`;

		if (fs.existsSync(inviteCodesPath)) {
			console.error('using cached invite-codes.json');
			return fs
				.readFileSync(inviteCodesPath)
				.toString()
				.trim()
				.split('\n')
				.map(s => JSON.parse(s));
		}

		const _inviteCodes = [];
		const inviteCodesRef = database.ref(`${namespacePath}/inviteCodes`);
		let lastItemKey = undefined;
		const paginationSize = 10000;

		while (true) {
			const chunk =
				(
					await (lastItemKey ?
						inviteCodesRef.startAfter(undefined, lastItemKey) :
						inviteCodesRef
					)
						.limitToFirst(paginationSize)
						.once('value')
				).val() || {};

			const keys = Object.keys(chunk).sort();
			if (keys.length < 1) {
				break;
			}

			_inviteCodes.push(
				...keys.map(k => ({
					...chunk[k],
					code: k
				}))
			);

			lastItemKey = keys.slice(-1)[0];
		}

		console.error('caching invite code data at invite-codes.json');
		fs.writeFileSync(
			inviteCodesPath,
			_inviteCodes.map(o => JSON.stringify(o)).join('\n')
		);

		return _inviteCodes;
	})();

	const users = await (async () => {
		const usersPath = `${__dirname}/../users.processed`;

		if (fs.existsSync(usersPath)) {
			console.error('using cached users.processed');
			return dynamicDeserialize(fs.readFileSync(usersPath));
		}

		const rawUsersPath = `${__dirname}/../users.json`;
		const rawUsersExists = fs.existsSync(rawUsersPath);

		const rawUsers = rawUsersExists ?
			JSON.parse(fs.readFileSync(rawUsersPath).toString()) :
			(await database.ref(`${namespacePath}/users`).once('value')).val();

		if (rawUsersExists) {
			console.error('using cached users.json');
		}
		else {
			console.error('caching user data at users.json');
			fs.writeFileSync(rawUsersPath, JSON.stringify(rawUsers));
		}

		const _users = Promise.all(
			Array.from(Object.entries(rawUsers)).map(async ([username, user]) =>
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

		console.error('caching processed user data at users.processed');
		fs.writeFileSync(usersPath, dynamicSerializeBytes(_users));

		return _users;
	})();

	console.error('\n');

	return {inviteCodes, users};
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
