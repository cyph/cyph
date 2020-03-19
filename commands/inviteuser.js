#!/usr/bin/env node

const {config} = require('../modules/config');
const databaseService = require('../modules/database-service');
const {CyphPlans, CyphPlanTypes} = require('../modules/proto');
const {readableByteLength, titleize} = require('../modules/util');
const {addInviteCode} = require('./addinvitecode');
const {sendMail} = require('./email');
const {addToMailingList, mailingListIDs, splitName} = require('./mailchimp');

const inviteUser = async (
	projectId,
	email,
	name,
	plan,
	reservedUsername,
	trialMonths
) => {
	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	/* Gift free users one-month premium trials */
	if ((!plan || plan === 'Free') && !trialMonths) {
		plan = 'MonthlyPremium';
		trialMonths = 1;
	}

	const {database} = databaseService(projectId);
	const namespacePath = 'cyph_ws';

	const inviteCode = (await addInviteCode(
		projectId,
		{'': 1},
		undefined,
		plan,
		reservedUsername,
		trialMonths
	))[''][0];

	const cyphPlan = CyphPlans[plan] || CyphPlans.Free;
	const planConfig = config.planConfig[cyphPlan];

	if (projectId === 'cyphme' && email) {
		const {firstName, lastName} = splitName(name);

		const mailingListID = await addToMailingList(
			mailingListIDs.pendingInvites,
			email,
			{
				FNAME: firstName,
				ICODE: inviteCode,
				LNAME: lastName,
				PLAN: CyphPlans[cyphPlan]
			}
		);

		await database
			.ref(`${namespacePath}/pendingInvites/${inviteCode}`)
			.set(mailingListID);
	}

	await sendMail(
		!email ? undefined : !name ? email : `${name} <${email}>`,
		"You've Been Invited to Cyph!" +
			(cyphPlan === CyphPlans.Free ?
				'' :
			trialMonths ?
				` (with ${titleize(CyphPlans[cyphPlan])} trial)` :
				` (${titleize(CyphPlans[cyphPlan])})`),
		{
			data: {
				...planConfig,
				inviteCode,
				name,
				planAnnualBusiness: cyphPlan === CyphPlans.AnnualBusiness,
				planAnnualTelehealth: cyphPlan === CyphPlans.AnnualTelehealth,
				planFoundersAndFriends:
					planConfig.planType === CyphPlanTypes.FoundersAndFriends,
				planFree: planConfig.planType === CyphPlanTypes.Free,
				planMonthlyBusiness: cyphPlan === CyphPlans.MonthlyBusiness,
				planMonthlyTelehealth: cyphPlan === CyphPlans.MonthlyTelehealth,
				planPlatinum: planConfig.planType === CyphPlanTypes.Platinum,
				planPremium: planConfig.planType === CyphPlanTypes.Premium,
				planSupporter: planConfig.planType === CyphPlanTypes.Supporter,
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

		for (const {email, name, plan, reservedUsername, trialMonths} of process
			.argv[3] === '--users' ?
			JSON.parse(process.argv[4]).map(arr => ({
				email: arr[0],
				name: arr[1],
				plan: process.argv[5],
				reservedUsername: arr[2],
				trialMonths: arr[3]
			})) :
			[
				{
					email: process.argv[3],
					name: process.argv[4],
					plan: process.argv[5],
					reservedUsername: process.argv[6],
					trialMonths: process.argv[7]
				}
			]) {
			console.log(
				`Invited ${email} with invite code ${await inviteUser(
					projectId,
					email,
					name,
					plan,
					reservedUsername,
					trialMonths
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
