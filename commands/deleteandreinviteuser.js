#!/usr/bin/env node

const read = require('read');
const {normalize} = require('../modules/util');
const {deleteUser} = require('./deleteuser');
const {getUserMetadata} = require('./getusermetadata');
const {inviteUser} = require('./inviteuser');

const namespace = 'cyph.ws';

const deleteAndReinviteUser = async (projectId, username) => {
	username = normalize(username);

	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}
	if (!username) {
		throw new Error('Invalid username.');
	}

	const metadata = await getUserMetadata(projectId, username, namespace);

	console.log(JSON.stringify(metadata, undefined, '\t'));

	while (!metadata.internal.email) {
		metadata.internal.email = await new Promise((resolve, reject) => {
			read(
				{
					prompt: 'Email:'
				},
				(err, s) => {
					if (err || !s) {
						reject(err);
					}
					else {
						resolve(s);
					}
				}
			);
		});
	}

	while (!metadata.internal.name) {
		metadata.internal.name = await new Promise((resolve, reject) => {
			read(
				{
					prompt: 'Name:'
				},
				(err, s) => {
					if (err || !s) {
						reject(err);
					}
					else {
						resolve(s);
					}
				}
			);
		});
	}

	await deleteUser(projectId, namespace, username);

	const [inviteCode] = await inviteUser(
		projectId,
		metadata.internal.email,
		metadata.internal.name,
		metadata.plan,
		username,
		0,
		1,
		{
			...(metadata.internal.braintreeID ?
				{
					braintreeID: metadata.internal.braintreeID
				} :
				{}),
			...(metadata.internal.braintreeSubscriptionID ?
				{
					braintreeSubscriptionID:
						metadata.internal.braintreeSubscriptionID
				} :
				{}),
			...(metadata.profileExtra.pgp &&
			metadata.profileExtra.pgp.keybaseUsername ?
				{
					keybaseUsername: metadata.profileExtra.pgp.keybaseUsername
				} :
				{}),
			...(metadata.pgpPublicKey ?
				{
					pgpPublicKey: metadata.pgpPublicKey
				} :
				{})
		}
	);

	console.log(`Invited ${email} with invite code ${inviteCode}`);
};

if (require.main === module) {
	(async () => {
		const projectId = process.argv[2];
		const username = process.argv[3];

		await deleteAndReinviteUser(projectId, username);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports = {deleteAndReinviteUser};
}
