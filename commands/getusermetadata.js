#!/usr/bin/env node

const databaseService = require('../modules/database-service');
const {CyphPlan, CyphPlans, StringProto} = require('../modules/proto');
const {normalize} = require('../modules/util');

const getUserMetadata = async (projectId, username, namespace) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	username = normalize(username);

	const {getItem} = databaseService(projectId);

	const [email, inviteCode, plan] = await Promise.all([
		getItem(namespace, `users/${username}/email`, StringProto).catch(
			() => ''
		),
		getItem(namespace, `users/${username}/inviteCode`, StringProto).catch(
			() => ''
		),
		getItem(namespace, `users/${username}/plan`, CyphPlan)
			.then(o => o.plan)
			.catch(() => CyphPlans.Free)
	]);

	return {email, inviteCode, plan: CyphPlans[plan]};
};

if (require.main === module) {
	(async () => {
		const projectId = process.argv[2];
		const username = process.argv[3];
		const namespace = process.argv[4];

		console.log(
			JSON.stringify(
				await getUserMetadata(projectId, username, namespace)
			)
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports = {getUserMetadata};
}
