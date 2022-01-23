#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {userDataExport} from './userdataexport.js';

export const userStats = async (projectId, namespace) => {
	const users = await userDataExport(projectId, namespace);

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
