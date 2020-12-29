#!/usr/bin/env node

const braintree = require('braintree');
const fs = require('fs');
const os = require('os');

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

const refundTransaction = async ({id, status, type}) => {
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

const refundSubscription = async subscriptionID => {
	const subscription = await gateway.subscription.find(subscriptionID);

	if (subscription.status[0] !== 'Active') {
		return;
	}

	await Promise.all(
		subscription.transactions.map(async o =>
			refundTransaction({
				id: o.transaction[0].id[0],
				status: o.transaction[0].status[0],
				type: o.transaction[0].type[0]
			})
		)
	);

	await gateway.subscription.cancel(subscriptionID);
};

const refundSubscriptions = async subscriptionIDs => {
	for (const subscriptionID of subscriptionIDs) {
		await refundSubscription(subscriptionID);
	}
};

if (require.main === module) {
	(async () => {
		await refundSubscriptions(process.argv.slice(2));
		console.log('done');
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
else {
	module.exports = {refundSubscriptions};
}
