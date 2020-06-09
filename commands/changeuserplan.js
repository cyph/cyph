#!/usr/bin/env node

const firebase = require('firebase-admin');
const fs = require('fs');
const os = require('os');
const {config} = require('../modules/config');
const databaseService = require('../modules/database-service');
const {CyphPlan, CyphPlans, CyphPlanTypes} = require('../modules/proto');
const {
	readableByteLength,
	normalize,
	readableID,
	titleize
} = require('../modules/util');
const {sendMail} = require('./email');

const changeUserPlan = async (projectId, username, plan, namespace) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}
	if (!(plan in CyphPlans)) {
		throw new Error(`Plan "${plan}" not found.`);
	}

	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	const namespacePath = namespace.replace(/\./g, '_');

	username = normalize(username);

	const {
		auth,
		database,
		getItem,
		removeItem,
		setItem,
		storage
	} = databaseService(projectId);

	const cyphPlan = CyphPlans[plan];

	const [email, name, oldPlan] = await Promise.all([
		database
			.ref(`${namespacePath}/users/${username}/internal/email`)
			.once('value')
			.then(o => o.val()),
		database
			.ref(`${namespacePath}/users/${username}/internal/name`)
			.once('value')
			.then(o => o.val()),
		getItem(namespace, `users/${username}/plan`, CyphPlan)
			.then(o => o.plan)
			.catch(() => CyphPlans.Free)
	]);

	if (cyphPlan === oldPlan) {
		throw new Error(`User already has plan "${plan}".`);
	}

	const planConfig = config.planConfig[cyphPlan];
	const oldPlanConfig = config.planConfig[oldPlan];
	const isUpgrade = planConfig.rank > oldPlanConfig.rank;

	await Promise.all([
		setItem(namespace, `users/${username}/plan`, CyphPlan, {
			plan: cyphPlan
		}),
		database
			.ref(`${namespacePath}/users/${username}/internal/braintreeID`)
			.remove(),
		database
			.ref(
				`${namespacePath}/users/${username}/internal/braintreeSubscriptionID`
			)
			.remove(),
		database
			.ref(`${namespacePath}/users/${username}/internal/planTrialEnd`)
			.remove(),
		(async () => {
			if (planConfig.initialInvites === undefined) {
				return;
			}

			const numInvites = Object.keys(
				(await database
					.ref(`${namespacePath}/users/${username}/inviteCodes`)
					.once('value')).val() || {}
			).length;

			if (numInvites >= planConfig.initialInvites) {
				return;
			}

			return Promise.all(
				new Array(planConfig.initialInvites - numInvites)
					.fill('')
					.map(() => readableID(15))
					.map(async code =>
						Promise.all([
							database
								.ref(`${namespacePath}/inviteCodes/${code}`)
								.set({
									inviterUsername: username
								}),
							setItem(
								namespace,
								`users/${username}/inviteCodes/${code}`,
								BooleanProto,
								true
							)
						])
					)
			);
		})()
	]);

	if (email) {
		await sendMail(
			!email ? undefined : !name ? email : `${name} <${email}>`,
			isUpgrade ? 'Cyph Status Upgrade!' : 'Your Cyph Status',
			{
				data: {
					...planConfig,
					name,
					oldPlan: titleize(CyphPlans[oldPlan]),
					planAnnualBusiness: cyphPlan === CyphPlans.AnnualBusiness,
					planAnnualTelehealth:
						cyphPlan === CyphPlans.AnnualTelehealth,
					planChange: true,
					planChangeUpgrade: isUpgrade,
					planFoundersAndFriends:
						planConfig.planType ===
						CyphPlanTypes.FoundersAndFriends,
					planFoundersAndFriendsTelehealth:
						planConfig.planType ===
						CyphPlanTypes.FoundersAndFriends_Telehealth,
					planFree: planConfig.planType === CyphPlanTypes.Free,
					planMonthlyBusiness: cyphPlan === CyphPlans.MonthlyBusiness,
					planMonthlyTelehealth:
						cyphPlan === CyphPlans.MonthlyTelehealth,
					planPlatinum:
						planConfig.planType === CyphPlanTypes.Platinum,
					planPremium: planConfig.planType === CyphPlanTypes.Premium,
					planSupporter:
						planConfig.planType === CyphPlanTypes.Supporter,
					platinumFeatures: planConfig.usernameMinLength === 1,
					storageCap: readableByteLength(
						planConfig.storageCapGB,
						'gb'
					)
				},
				templateName: 'new-cyph-invite'
			},
			undefined,
			undefined,
			accountsURL
		);
	}

	return CyphPlans[cyphPlan];
};

if (require.main === module) {
	(async () => {
		const projectId = process.argv[2];

		for (const {username, plan, namespace} of process.argv[3] ===
		'--users' ?
			JSON.parse(process.argv[4]).map(username => ({
				username,
				plan: process.argv[5],
				namespace: process.argv[6]
			})) :
			[
				{
					username: process.argv[3],
					plan: process.argv[4],
					namespace: process.argv[5]
				}
			]) {
			console.log(
				`Granted ${username} status ${await changeUserPlan(
					projectId,
					username,
					plan,
					namespace
				)}`
			);
		}

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports = {changeUserPlan};
}
