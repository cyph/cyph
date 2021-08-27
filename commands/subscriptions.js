#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import {initSubscriptionService} from '../modules/subscription-service.js';

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

export const {
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
} = initSubscriptionService({
	braintree: {
		merchantId: vars.BRAINTREE_MERCHANT_ID,
		privateKey: vars.BRAINTREE_PRIVATE_KEY,
		publicKey: vars.BRAINTREE_PUBLIC_KEY
	},
	stripeSecretKey: vars.STRIPE_SECRET_KEY
});
