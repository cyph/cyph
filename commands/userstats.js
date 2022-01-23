#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import fs from 'fs';
import {initDatabaseService} from '../modules/database-service.js';
import {getUserMetadata} from './getusermetadata.js';

const {dynamicDeserialize, dynamicSerializeBytes} = util;

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

	const planGroups = users.reduce(
		(o, user) => ({
			...o,
			[user.plan.name]: (o[user.plan.name] || []).concat(user)
		}),
		{}
	);

	const getGroupData = group => {
		const totals = {
			accountAgeDays: 0,
			contactCount: 0,
			daysSinceLastLogin: 0,
			hasEmailAddressCount: 0,
			hasVerifiedEmailCount: 0,
			masterKeyConfirmedCount: 0,
			messageCount: 0,
			planAgeDays: 0,
			userCount: group.length
		};

		for (const user of group) {
			totals.accountAgeDays += user.dates.signup.daysSince;
			totals.contactCount += user.contactCount;
			totals.daysSinceLastLogin += user.dates.lastLogin.daysSince;
			totals.hasEmailAddressCount += user.internal?.email ? 1 : 0;
			totals.hasVerifiedEmailCount += user.internal?.emailVerified ?
				1 :
				0;
			totals.masterKeyConfirmedCount += user.masterKeyConfirmed ? 1 : 0;
			totals.messageCount += user.messageCount;
			totals.planAgeDays += user.plan.lastChange.daysSince;
		}

		return {
			averages: Object.entries(totals)
				.map(([k, v]) =>
					k === 'userCount' ?
						{} :
					k.endsWith('Count') ?
						{
							[`${k.slice(0, -5)}Percentage`]: parseFloat(
									((v / group.length) * 100).toFixed(2)
								)
						} :
						{[k]: parseFloat((v / group.length).toFixed(2))}
				)
				.reduce((a, b) => ({...a, ...b}), {}),
			totals
		};
	};

	return {
		plans: Object.entries(planGroups).map(([plan, group]) => [
			plan,
			getGroupData(group)
		]),
		total: getGroupData(users)
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
