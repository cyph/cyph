#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {configService as config, proto, util} from '@cyph/sdk';
import {initDatabaseService} from '../modules/database-service.js';
import {addInviteCode} from './addinvitecode.js';
import {sendEmail} from './email.js';
import {addToMailingList, mailingListIDs} from './emailmarketing.js';

const {CyphPlans, CyphPlanTypes} = proto;
const {readableByteLength, titleize} = util;

export const inviteUser = async (
	projectId,
	email,
	name,
	plan,
	reservedUsername,
	trialMonths,
	count = 1,
	misc = {}
) => {
	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	/* Previously gifted free users one-month premium trials */
	if (false && (!plan || plan === 'Free') && !trialMonths) {
		plan = 'MonthlyPremium';
		trialMonths = 1;
	}

	const {database} = initDatabaseService(projectId);
	const namespacePath = 'cyph_ws';

	const inviteCodes = (
		await addInviteCode(
			projectId,
			{'': count},
			undefined,
			plan,
			reservedUsername,
			trialMonths,
			email,
			misc
		)
	)[''];

	const inviteCode = inviteCodes[0];

	const cyphPlan = CyphPlans[plan] || CyphPlans.Free;
	const planConfig = config.planConfig[cyphPlan];

	if (projectId === 'cyphme' && email) {
		try {
			await addToMailingList(mailingListIDs.pendingInvites, email, {
				inviteCode,
				keybaseUsername: misc.keybaseUsername,
				name,
				plan,
				trial: !!trialMonths
			});

			await database
				.ref(`${namespacePath}/pendingInvites/${inviteCode}`)
				.set(email);
		}
		catch {}
	}

	await sendEmail(
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
				...(inviteCodes.length > 1 ? {inviteCodes} : {inviteCode}),
				name,
				planAnnualBusiness: cyphPlan === CyphPlans.AnnualBusiness,
				planAnnualTelehealth: cyphPlan === CyphPlans.AnnualTelehealth,
				planFoundersAndFriends:
					planConfig.planType === CyphPlanTypes.FoundersAndFriends,
				planFoundersAndFriendsTelehealth:
					planConfig.planType ===
					CyphPlanTypes.FoundersAndFriends_Telehealth,
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

	return inviteCodes;
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];

		for (const {
			count,
			email,
			misc,
			name,
			plan,
			reservedUsername,
			trialMonths
		} of process.argv[3] === '--users' ?
			JSON.parse(process.argv[4]).map(arr => ({
				count: process.argv[6],
				email: arr[0],
				misc: arr[4],
				name: arr[1],
				plan: process.argv[5],
				reservedUsername: arr[2],
				trialMonths: arr[3]
			})) :
			[
				{
					count: process.argv[8],
					misc: JSON.parse(process.argv[9] || '{}'),
					email: process.argv[3],
					name: process.argv[4],
					plan: process.argv[5],
					reservedUsername: process.argv[6],
					trialMonths: process.argv[7]
				}
			]) {
			console.log(
				`Invited ${email} with invite codes ${JSON.stringify(
					await inviteUser(
						projectId,
						email,
						name,
						plan,
						reservedUsername,
						trialMonths,
						count,
						misc
					)
				)}`
			);
		}

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
