#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {batchUpdateMailingList, mailingListIDs} from './mailchimp.js';
import {userDataExport} from './userdataexport.js';

export const updateMailchimp = async (projectId, namespace) => {
	const users = await userDataExport(projectId, namespace);

	return batchUpdateMailingList(
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
