#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import read from 'read';
import {getUserMetadata} from './getusermetadata.js';
import {inviteUser} from './inviteuser.js';

const {normalize} = util;

const namespace = 'cyph.ws';

export const reinviteUser = async (projectId, username) => {
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
		metadata.internal.email = (
			await read({
				prompt: 'Email:'
			}).catch(() => undefined)
		)?.trim();
	}

	while (!metadata.internal.name) {
		metadata.internal.name = (
			await read({
				prompt: 'Name:'
			}).catch(() => undefined)
		)?.trim();
	}

	const reservedUsername = (
		await read({
			prompt: 'Username reservation (optional):'
		}).catch(() => undefined)
	)?.trim();

	const [inviteCode] = await inviteUser(
		projectId,
		metadata.internal.email,
		metadata.internal.name,
		metadata.plan.name,
		reservedUsername,
		0,
		1,
		{
			...(metadata.internal.appStoreReceipt ?
				{
					appStoreReceipt: metadata.internal.appStoreReceipt
				} :
				{}),
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
			...(metadata.internal.stripe ?
				{
					stripe: metadata.internal.stripe
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

	console.log(
		`Invited ${metadata.internal.email} with invite code ${inviteCode}`
	);
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const username = process.argv[3];

		await reinviteUser(projectId, username);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
