#!/usr/bin/env node

import {util} from '@cyph/sdk';
import braintree from 'braintree';
import fs from 'fs';
import os from 'os';
import initStripe from 'stripe';

const {uuid} = util;

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

const stripe = initStripe(vars.STRIPE_SECRET_KEY);

const braintreeRefundTransaction = async ({id, status, type}) => {
	if (type === 'credit') {
		return;
	}

	if (
		status === 'authorized' ||
		status === 'settlement_pending' ||
		status === 'submitted_for_settlement'
	) {
		await gateway.transaction.void(id);
	}
	else if (status === 'settled' || status === 'settling') {
		await gateway.transaction.refund(id);
	}
};

const braintreeCancelSubscription = async subscriptionID => {
	await gateway.subscription.cancel(subscriptionID);
};

const braintreeCloneSubscription = async subscriptionID => {
	const subscription = await gateway.subscription.find(subscriptionID);

	return (await gateway.subscription.create({
		addOns: subscription.addOns,
		discounts: subscription.discounts,
		id: uuid(),
		paymentMethodToken: subscription.paymentMethodToken,
		planId: subscription.planId,
		price: subscription.price
	})).subscription.id;
};

const braintreeRefundSubscription = async subscriptionID => {
	const subscription = await gateway.subscription.find(subscriptionID);

	if (subscription.status[0] !== 'Active') {
		console.error(`Skipping subscription: ${subscriptionID}`);
		return;
	}

	await Promise.all(
		subscription.transactions.map(async o =>
			braintreeRefundTransaction({
				id: o.transaction[0].id[0],
				status: o.transaction[0].status[0],
				type: o.transaction[0].type[0]
			})
		)
	);

	await braintreeCancelSubscription(subscriptionID);
};

const stripeCancelSubscription = async subscriptionID => {
	await stripe.subscriptions.del(subscriptionID);
};

const stripeCloneSubscription = async subscriptionID => {
	const subscription = await stripe.subscriptions.retrieve(subscriptionID);

	return (await stripe.subscriptions.create({
		cancel_at_period_end: subscription.cancel_at_period_end,
		customer: subscription.customer,
		default_payment_method: subscription.default_payment_method,
		items: subscription.items.data.map(o => ({
			billing_thresholds: o.billing_thresholds,
			metadata: o.metadata,
			price: o.price.id,
			quantity: o.quantity,
			tax_rates: o.tax_rates.map(taxRate => taxRate.id)
		})),
		metadata: subscription.metadata
	})).id;
};

const stripeRefundSubscription = async subscriptionID => {
	throw new Error('Not implemented.');

	const subscription = await stripe.subscriptions.retrieve(subscriptionID);

	if (subscription.status !== 'active') {
		console.error(`Skipping subscription: ${subscriptionID}`);
		return;
	}

	/* TODO: Issue refund */

	await stripeCancelSubscription(subscriptionID);
};

export const cancelSubscriptions = async (...subscriptions) => {
	for (const o of subscriptions) {
		if (o.apple) {
			throw new Error('Not implemented.');
		}
		if (o.braintree) {
			await braintreeCancelSubscription(o.braintree);
		}
		if (o.stripe) {
			await stripeCancelSubscription(o.stripe);
		}
	}
};

export const cloneSubscription = async ({apple, braintree, stripe}) => {
	if (apple) {
		throw new Error('Not implemented.');
	}
	else if (braintree) {
		return braintreeCloneSubscription(braintree);
	}
	else if (stripe) {
		return stripeCloneSubscription(stripe);
	}

	throw new Error('Not implemented.');
};

export const refundSubscriptions = async (...subscriptions) => {
	for (const o of subscriptions) {
		if (o.apple) {
			throw new Error('Not implemented.');
		}
		if (o.braintree) {
			await braintreeRefundSubscription(o.braintree);
		}
		if (o.stripe) {
			await stripeRefundSubscription(o.stripe);
		}
	}
};
