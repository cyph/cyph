#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import fs from 'fs';
import {initDatabaseService} from '../modules/database-service.js';
import {getUserMetadata} from './getusermetadata.js';

const {dynamicDeserialize, dynamicSerializeBytes, getOrSetDefault} = util;

export const userStats = async (projectId, namespace) => {
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

	const planCounts = new Map();
	const planContactCounts = new Map();
	let totalContacts = 0;

	for (const {
		contactCount,
		plan: {name: plan}
	} of users) {
		planCounts.set(plan, getOrSetDefault(planCounts, plan, () => 0) + 1);

		planContactCounts.set(
			plan,
			getOrSetDefault(planContactCounts, plan, () => 0) + contactCount
		);

		totalContacts += contactCount;
	}

	return {
		plans: Array.from(planCounts.entries()).map(([plan, userCount]) => [
			plan,
			{
				averageContactCount: (
					planContactCounts.get(plan) / userCount
				).toFixed(2),
				userCount
			}
		]),
		total: {
			averageContactCount: (totalContacts / users.length).toFixed(2),
			userCount: users.length
		}
	};
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const namespace = process.argv[3];

		console.dir(await userStats(projectId, namespace), {depth: undefined});

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
