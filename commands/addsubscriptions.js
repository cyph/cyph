#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import braintree from 'braintree';
import fs from 'fs';
import memoize from 'lodash-es/memoize';
import os from 'os';
import read from 'read';
import {getUserMetadata} from './getusermetadata.js';
import {inviteUser} from './inviteuser.js';

const {normalize, uuid} = util;

const namespace = 'cyph.ws';

const vars = fs
	.readFileSync(os.homedir() + '/.cyph/backend.vars.prod')
	.toString()
	.split('\n')
	.map(line =>
		line
			.split(':')
			.map((s, i) => (i === 0 ? s.trim() : s.trim().slice(1, -1)))
	)
	.reduce((o, [k, v]) => ({...o, [k]: v}), {});

const gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Production,
	merchantId: vars.BRAINTREE_MERCHANT_ID,
	privateKey: vars.BRAINTREE_PRIVATE_KEY,
	publicKey: vars.BRAINTREE_PUBLIC_KEY
});

const getSubscription = memoize(async subscriptionID =>
	gateway.subscription.find(subscriptionID)
);

const cloneSubscription = async subscriptionID => {
	const subscription = await getSubscription(subscriptionID);

	return (await gateway.subscription.create({
		addOns: subscription.addOns,
		discounts: subscription.discounts,
		id: uuid(),
		paymentMethodToken: subscription.paymentMethodToken,
		planId: subscription.planId,
		price: subscription.price
	})).subscription.id;
};

export const addSubscriptions = async (projectId, username, count) => {
	username = normalize(username);

	if (isNaN(count)) {
		throw new Error('Invalid subscription count.');
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
		!metadata.internal.braintreeID ||
		!metadata.internal.braintreeSubscriptionID
	) {
		throw new Error('Invalid subscription data.');
	}

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

	const inviteCodes = await inviteUser(
		projectId,
		metadata.internal.email,
		metadata.internal.name,
		metadata.plan,
		undefined,
		0,
		count,
		async () => ({
			braintreeID: metadata.internal.braintreeID,
			braintreeSubscriptionID: await cloneSubscription(
				metadata.internal.braintreeSubscriptionID
			)
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

		process.exit();
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
