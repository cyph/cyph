#!/usr/bin/env node

const databaseService = require('../modules/database-service');
const {getUserMetadata} = require('./getusermetadata');

const lookUpUser = async (projectId, query, namespace) => {
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

if (require.main === module) {
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
else {
	module.exports = {lookUpUser};
}
