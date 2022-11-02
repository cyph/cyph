#!/usr/bin/env node

import {util} from '@cyph/sdk';
import braintree from 'braintree';
import memoize from 'lodash-es/memoize.js';
import initStripe from 'stripe';
import superSphincs from 'supersphincs';

const {uuid} = util;

export const initSubscriptionService = (config = {}) => {
	const gateway =
		braintree && config.braintree ?
			new braintree.BraintreeGateway({
				...config.braintree,
				environment: braintree.Environment.Production
			}) :
			undefined;

	const stripe = initStripe(config.stripeSecretKey);

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

		return (
			await gateway.subscription.create({
				addOns: subscription.addOns,
				discounts: subscription.discounts,
				id: uuid(),
				paymentMethodToken: subscription.paymentMethodToken,
				planId: subscription.planId,
				price: subscription.price
			})
		).subscription.id;
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

	const stripeCancelSubscriptionItem = async subscriptionItemID => {
		await stripe.subscriptionItems.del(subscriptionItemID);
	};

	const stripeCloneSubscription = async subscriptionID => {
		const subscription = await stripe.subscriptions.retrieve(
			subscriptionID
		);

		return (
			await stripe.subscriptions.create({
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
			})
		).id;
	};

	const stripeCloneSubscriptionItem = async (
		subscriptionItemID,
		overrideProductID
	) => {
		const subscriptionItem = await stripe.subscriptionItems.retrieve(
			subscriptionItemID
		);

		return (
			await stripe.subscriptionItems.create({
				metadata: subscriptionItem.metadata,
				price_data: {
					currency: subscriptionItem.price.currency,
					product:
						overrideProductID || subscriptionItem.price.product,
					recurring: {
						interval: subscriptionItem.price.recurring.interval
					},
					unit_amount: subscriptionItem.price.unit_amount
				},
				quantity: 1,
				subscription: subscriptionItem.subscription
			})
		).id;
	};

	const stripeCustomizeProduct = async (planID, metadata) => {
		throw new Error('Not implemented.');

		/* TODO: Remove this after confirming that it isn't needed. */

		const {username, inviteCode} = metadata;

		const product = await (async () => {
			const o = await stripeGetProduct(planID);
			return o.metadata.parent ? stripeGetProduct(o.metadata.parent) : o;
		})();

		if (!username && !inviteCode) {
			return product.id;
		}

		const id = `child_product_${
			(
				await superSphincs.hash(
					`${product.id}\n${username || ''}\n${inviteCode || ''}`
				)
			).hex
		}`;

		try {
			await stripe.products.retrieve(id);
			return id;
		}
		catch {}

		await stripe.products.create({
			id,
			metadata: {
				parent: product.id
			},
			name: `${
				username ? `@${username}` : `Invite Code ${inviteCode}`
			} —— ${product.name}`
		});

		return id;
	};

	const stripeGetProduct = memoize(async planID =>
		stripe.products.retrieve(planID)
	);

	const stripeUpdateSubscriptionItem = async (
		subscriptionItemID,
		metadata = {}
	) => {
		const subscriptionItem = await stripe.subscriptionItems.retrieve(
			subscriptionItemID
		);

		const productID = await stripeCustomizeProduct(
			subscriptionItem.price.product,
			{...subscriptionItem.metadata, ...metadata}
		);

		if (subscriptionItem.price.product === productID) {
			return subscriptionItemID;
		}

		const newSubscriptionItemID = await stripeCloneSubscriptionItem(
			subscriptionItemID,
			productID
		);

		await stripe.subscriptionItems.del(subscriptionItemID);

		return newSubscriptionItemID;
	};

	const stripeRefundSubscription = async subscriptionID => {
		throw new Error('Not implemented.');

		const subscription = await stripe.subscriptions.retrieve(
			subscriptionID
		);

		if (subscription.status !== 'active') {
			console.error(`Skipping subscription: ${subscriptionID}`);
			return;
		}

		/* TODO: Issue refund */

		await stripeCancelSubscription(subscriptionID);
	};

	const stripeRefundSubscriptionItem = async subscriptionItemID => {
		throw new Error('Not implemented.');
	};

	const cancelSubscriptions = async (...subscriptions) => {
		for (const o of subscriptions) {
			if (o.apple) {
				throw new Error('Not implemented.');
			}
			if (o.braintree) {
				await braintreeCancelSubscription(o.braintree);
			}
			if (o.stripe) {
				await stripeCancelSubscriptionItem(o.stripe);
			}
		}
	};

	const cloneSubscription = async ({apple, braintree, stripe}) => {
		if (apple) {
			throw new Error('Not implemented.');
		}
		else if (braintree) {
			return braintreeCloneSubscription(braintree);
		}
		else if (stripe) {
			return stripeCloneSubscriptionItem(stripe);
		}

		throw new Error('Not implemented.');
	};

	const refundSubscriptions = async (...subscriptions) => {
		for (const o of subscriptions) {
			if (o.apple) {
				throw new Error('Not implemented.');
			}
			if (o.braintree) {
				await braintreeRefundSubscription(o.braintree);
			}
			if (o.stripe) {
				await stripeRefundSubscriptionItem(o.stripe);
			}
		}
	};

	return {
		braintreeCancelSubscription,
		braintreeCloneSubscription,
		braintreeRefundSubscription,
		braintreeRefundTransaction,
		cancelSubscriptions,
		cloneSubscription,
		gateway,
		refundSubscriptions,
		stripe,
		stripeCancelSubscription,
		stripeCancelSubscriptionItem,
		stripeCloneSubscription,
		stripeCloneSubscriptionItem,
		stripeCustomizeProduct,
		stripeGetProduct,
		stripeRefundSubscription,
		stripeRefundSubscriptionItem,
		stripeUpdateSubscriptionItem
	};
};
