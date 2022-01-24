#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {batchUpdateMailingList, mailingListIDs} from './mailchimp.js';
import {userDataExport} from './userdataexport.js';

export const updateMailchimp = async (projectId, namespace) => {
	const {inviteCodes, users} = await userDataExport(projectId, namespace);

	const pendingInvitesUpdateResponse = await batchUpdateMailingList(
		mailingListIDs.pendingInvites,
		inviteCodes
			.filter(inviteCode => inviteCode.email)
			.map(inviteCode => ({
				email: inviteCode.email,
				mergeFields: {
					inviteCode: inviteCode.code,
					inviterUsername: inviteCode.inviterUsername,
					plan: inviteCode.plan,
					trial: !!inviteCode.planTrialEnd
				},
				statusIfNew: 'subscribed'
			}))
	);

	const usersUpdateResponse = await batchUpdateMailingList(
		mailingListIDs.users,
		users
			.filter(user => user.internal?.email)
			.map(user => ({
				email: user.internal.email,
				mergeFields: {
					user
				},
				statusIfNew: 'subscribed'
			}))
	);

	return {pendingInvitesUpdateResponse, usersUpdateResponse};
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const namespace = process.argv[3];

		console.dir(await updateMailchimp(projectId, namespace), {
			depth: undefined
		});

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
