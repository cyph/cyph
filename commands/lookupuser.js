#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import databaseService from '../modules/database-service.js';
import {getUserMetadata} from './getusermetadata.js';

export const lookUpUser = async (projectId, query, namespace) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	if (typeof query !== 'string' || !query || query.indexOf('/') > -1) {
		throw new Error('Invalid query.');
	}

	const {database} = databaseService(projectId);

	const isEmail = query.indexOf('@') > -1;

	const inviteCodes = isEmail ?
		(await database
			.ref(
				`${namespace.replace(
					/\./g,
					'_'
				)}/inviteCodeEmailAddresses/${Buffer.from(query).toString(
					'hex'
				)}`
			)
			.once('value')).val() || undefined :
		undefined;

	const {username} =
		(await database
			.ref(
				`${namespace.replace(/\./g, '_')}/${
					isEmail ?
						`initialEmailAddresses/${Buffer.from(query).toString(
							'hex'
						)}` :
						`consumedInviteCodes/${query}`
				}`
			)
			.once('value')).val() || {};

	return {
		inviteCodes,
		userMetadata: username ?
			await getUserMetadata(projectId, username, namespace) :
			undefined
	};
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const query = process.argv[3];
		const namespace = process.argv[4];

		console.log(
			JSON.stringify(
				await lookUpUser(projectId, query, namespace),
				undefined,
				'\t'
			)
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
