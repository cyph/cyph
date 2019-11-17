#!/usr/bin/env node

const firebase = require('firebase-admin');
const fs = require('fs');
const os = require('os');
const {config} = require('../modules/config');
const databaseService = require('../modules/database-service');
const {CyphPlan, CyphPlans} = require('../modules/proto');
const {readableByteLength, titleize} = require('../modules/util');
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

	const configDir = `${os.homedir()}/.cyph`;
	const keyFilename = `${configDir}/firebase-credentials/${projectId}.json`;
	const namespacePath = namespace.replace(/\./g, '_');

	const {
		auth,
		database,
		getItem,
		removeItem,
		setItem,
		storage
	} = databaseService({
		firebase: {
			credential: firebase.credential.cert(
				JSON.parse(fs.readFileSync(keyFilename).toString())
			),
			databaseURL: `https://${projectId}.firebaseio.com`
		},
		project: {id: projectId},
		storage: {keyFilename, projectId}
	});

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
	const isUpgrade = cyphPlan > oldPlan;

	await setItem(namespace, `users/${username}/plan`, CyphPlan, {
		plan: cyphPlan
	});

	if (email) {
		await sendMail(
			!email ? undefined : !name ? email : `${name} <${email}>`,
			isUpgrade ? 'Cyph Status Upgrade!' : 'Your Cyph Status',
			{
				data: {
					...planConfig,
					name,
					oldPlan: titleize(CyphPlans[oldPlan]),
					planChange: true,
					planChangeUpgrade: isUpgrade,
					planFoundersAndFriends:
						cyphPlan === CyphPlans.FoundersAndFriends,
					planFree: cyphPlan === CyphPlans.Free,
					planGold: cyphPlan === CyphPlans.Gold,
					planLifetimePlatinum:
						cyphPlan === CyphPlans.LifetimePlatinum,
					planSilver: cyphPlan === CyphPlans.Silver,
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
