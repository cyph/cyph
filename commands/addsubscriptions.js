#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import read from 'read';
import {getUserMetadata} from './getusermetadata.js';
import {inviteUser} from './inviteuser.js';
import {cloneSubscription} from './subscriptions.js';

const {normalize} = util;

const namespace = 'cyph.ws';

export const addSubscriptions = async (projectId, username, count) => {
	username = normalize(username);

	if (isNaN(count)) {
		throw new Error('Invalid quantity.');
	}

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

	if (
		!(
			(metadata.internal.braintreeID &&
				metadata.internal.braintreeSubscriptionID) ||
			(metadata.internal.stripe &&
				metadata.internal.stripe.customerID &&
				metadata.internal.stripe.subscriptionID &&
				metadata.internal.stripe.subscriptionItemID)
		)
	) {
		throw new Error('Invalid subscription data.');
	}

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

	const subscriptionIDs = new Array(count).fill(0).map(
		metadata.internal.stripe &&
			metadata.internal.stripe.subscriptionItemID ?
			async () =>
				cloneSubscription({
					stripe: metadata.internal.stripe.subscriptionItemID
				}) :
			async () =>
				cloneSubscription({
					braintree: metadata.internal.braintreeSubscriptionID
				})
	);

	const inviteCodes = await inviteUser(
		projectId,
		metadata.internal.email,
		metadata.internal.name,
		metadata.plan.name,
		undefined,
		0,
		count,
		metadata.internal.stripe &&
			metadata.internal.stripe.subscriptionItemID ?
			async () => ({
				stripe: {
					...metadata.internal.stripe,
					subscriptionItemID: await subscriptionIDs.shift()
				}
			}) :
			async () => ({
				braintreeID: metadata.internal.braintreeID,
				braintreeSubscriptionID: await subscriptionIDs.shift()
			})
	);

	console.log(
		`Invited ${metadata.internal.email} with invite codes ${JSON.stringify(
			inviteCodes
		)}`
	);
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const username = process.argv[3];
		const count = parseInt(process.argv[4], 10);

		await addSubscriptions(projectId, username, count);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
