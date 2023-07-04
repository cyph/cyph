#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {batchUpdateMailingList, mailingListIDs} from './emailmarketing.js';
import {userDataExport} from './userdataexport.js';

export const updateEmailMarketing = async (projectId, namespace) => {
	const {inviteCodes, users} = await userDataExport(projectId, namespace);

	await batchUpdateMailingList(
		mailingListIDs.pendingInvites,
		inviteCodes
			.filter(inviteCode => inviteCode.email)
			.map(inviteCode => ({
				email: inviteCode.email,
				mergeFields: {
					inviteCode: inviteCode.code,
					inviterUsername: inviteCode.inviterUsername,
					keybaseUsername: inviteCode.keybaseUsername,
					plan: inviteCode.plan,
					trial: !!inviteCode.planTrialEnd
				}
			}))
	);

	await batchUpdateMailingList(
		mailingListIDs.users,
		users
			.filter(user => user.internal?.email)
			.map(user => ({
				email: user.internal.email,
				mergeFields: {
					user
				}
			}))
	);
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const namespace = process.argv[3];

		await updateEmailMarketing(projectId, namespace);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
