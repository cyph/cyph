#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {proto, util} from '@cyph/sdk';
import fs from 'fs';
import {initDatabaseService} from '../modules/database-service.js';

const {CyphPlan, CyphPlans} = proto;
const {deserialize, getOrSetDefault} = util;

export const userStats = async (projectId, namespace) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	const {database} = initDatabaseService(projectId);
	const namespacePath = namespace.replace(/\./g, '_');

	const allUsersPath = `${__dirname}/../users.json`;
	const allUsersExists = fs.existsSync(allUsersPath);

	const allUsers = allUsersExists ?
		JSON.parse(fs.readFileSync(allUsersPath).toString()) :
		(await database.ref(`${namespacePath}/users`).once('value')).val();

	if (allUsersExists) {
		console.error('using cached users.json');
	}
	else {
		console.error('caching user data at users.json');
		fs.writeFileSync(allUsersPath, JSON.stringify(allUsers));
	}

	console.error('\n');

	const allUsersArray = Array.from(Object.entries(allUsers));

	const planCounts = new Map();
	const planContactCounts = new Map();
	let totalContacts = 0;

	for (const [username, user] of allUsersArray) {
		const contactCount = Object.keys(user.contacts || {}).length;

		const plan = user.plan?.data ?
			(await deserialize(CyphPlan, Buffer.from(user.plan.data, 'base64')))
				.plan :
			CyphPlans.Free;
		const planString = CyphPlans[plan];

		planCounts.set(
			planString,
			getOrSetDefault(planCounts, planString, () => 0) + 1
		);

		planContactCounts.set(
			planString,
			getOrSetDefault(planContactCounts, planString, () => 0) +
				contactCount
		);

		totalContacts += contactCount;
	}

	return {
		averageContactCount: (totalContacts / allUsersArray.length).toFixed(2),
		plans: Array.from(planCounts.entries()).map(([plan, userCount]) => [
			plan,
			{
				averageContactCount: (
					planContactCounts.get(plan) / userCount
				).toFixed(2),
				userCount
			}
		]),
		userCount: allUsersArray.length
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
