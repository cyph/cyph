#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import databaseService from '../modules/database-service.js';
import {normalize} from '../modules/util.js';

export const changeInviteCode = async (
	projectId,
	inviteCode,
	data,
	namespace
) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	const namespacePath = namespace.replace(/\./g, '_');

	const {database} = databaseService(projectId);

	const oldInviteCodeValue = (await database
		.ref(`${namespacePath}/inviteCodes/${inviteCode}`)
		.once('value')).val();

	console.log({oldInviteCodeValue});

	if (!oldInviteCodeValue) {
		return;
	}

	await Promise.all(
		Object.entries(data).map(async ([k, v]) => {
			const ref = database.ref(
				`${namespacePath}/inviteCodes/${inviteCode}/${k}`
			);
			const oldValue = (await ref.once('value')).val();

			if (k === 'reservedUsername') {
				const oldReservedUsername = normalize(oldValue || '');
				const oldReservedUsernameRef = oldReservedUsername ?
					database.ref(
						`${namespacePath}/reservedUsernames/${oldReservedUsername}`
					) :
					undefined;

				if (
					oldReservedUsernameRef &&
					(await oldReservedUsernameRef.once('value')).val() === ''
				) {
					await oldReservedUsernameRef.remove();
				}

				if (v) {
					v = normalize(v);

					const reservedUsernameRef = v ?
						database.ref(
							`${namespacePath}/reservedUsernames/${v}`
						) :
						undefined;

					if (
						!reservedUsernameRef ||
						(await reservedUsernameRef.once('value')).exists()
					) {
						v = undefined;
					}
					else {
						await reservedUsernameRef.set('');
					}
				}
			}

			if (v === undefined) {
				await ref.remove();
				console.log(`Removed ${k} (old value: ${oldValue}).`);
			}
			else {
				await ref.set(v);
				console.log(`Set ${k} (old value: ${oldValue}) to ${v}.`);
			}
		})
	);

	console.log({
		newInviteCodeValue: (await database
			.ref(`${namespacePath}/inviteCodes/${inviteCode}`)
			.once('value')).val()
	});

	/*
	TODO: Consider adding an email notification.

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
	*/
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const inviteCode = process.argv[3];
		const data = process.argv[4];
		const namespace = process.argv[5];

		await changeInviteCode(
			projectId,
			inviteCode,
			JSON.parse(data),
			namespace
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
