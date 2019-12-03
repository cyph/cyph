#!/usr/bin/env node

const {config} = require('../modules/config');
const {CyphPlans} = require('../modules/proto');
const {readableByteLength} = require('../modules/util');
const {addInviteCode} = require('./addinvitecode');
const {sendMail} = require('./email');

const inviteUser = async (projectId, email, name, plan, reservedUsername) => {
	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	const inviteCode = (await addInviteCode(
		projectId,
		{'': 1},
		undefined,
		plan,
		reservedUsername
	))[''][0];

	const cyphPlan = CyphPlans[plan] || CyphPlans.Free;
	const planConfig = config.planConfig[cyphPlan];

	await sendMail(
		!email ? undefined : !name ? email : `${name} <${email}>`,
		'Your Cyph Invite',
		{
			data: {
				...planConfig,
				inviteCode,
				name,
				planAnnualPremium: cyphPlan === CyphPlans.AnnualPremium,
				planFoundersAndFriends:
					cyphPlan === CyphPlans.FoundersAndFriends,
				planFree: cyphPlan === CyphPlans.Free,
				planLifetimePlatinum: cyphPlan === CyphPlans.LifetimePlatinum,
				planMonthlyPremium: cyphPlan === CyphPlans.MonthlyPremium,
				platinumFeatures: planConfig.usernameMinLength === 1,
				storageCap: readableByteLength(planConfig.storageCapGB, 'gb')
			},
			templateName: 'new-cyph-invite'
		},
		undefined,
		undefined,
		accountsURL
	);

	return inviteCode;
};

if (require.main === module) {
	(async () => {
		const projectId = process.argv[2];

		for (const {email, name, plan, reservedUsername} of process.argv[3] ===
		'--users' ?
			JSON.parse(process.argv[4]).map(arr => ({
				email: arr[0],
				name: arr[1],
				plan: process.argv[5],
				reservedUsername: arr[2]
			})) :
			[
				{
					email: process.argv[3],
					name: process.argv[4],
					plan: process.argv[5],
					reservedUsername: process.argv[6]
				}
			]) {
			console.log(
				`Invited ${email} with invite code ${await inviteUser(
					projectId,
					email,
					name,
					plan,
					reservedUsername
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
	module.exports = {inviteUser};
}
