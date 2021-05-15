import {configService as config, proto} from '@cyph/sdk';
import {database, getItem, getTokenKey, onRequest, setItem} from '../init.js';
import {namespaces} from '../namespaces.js';
import * as tokens from '../tokens.js';
import {validateInput} from '../validation.js';

const {CyphPlan, CyphPlans} = proto;

export const downgradeAccount = onRequest(true, async (req, res, namespace) => {
	const {accountsURL} = namespaces[namespace];
	const removeAppStoreReceiptRef = req.body.removeAppStoreReceiptRef === true;
	const userToken = validateInput(req.body.userToken);

	const {username} = await tokens.open(
		userToken,
		await getTokenKey(namespace)
	);

	if (!username) {
		return {};
	}

	const currentPlan = await getItem(
		namespace,
		`users/${username}/plan`,
		CyphPlan
	)
		.catch(() => undefined)
		.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free));

	if (
		currentPlan === CyphPlans.Free ||
		config.planConfig[currentPlan].lifetime
	) {
		return {};
	}

	const internalURL = `${namespace}/users/${username}/internal`;
	const appStoreReceiptRef = database.ref(`${internalURL}/appStoreReceipt`);
	const braintreeIDRef = database.ref(`${internalURL}/braintreeID`);
	const braintreeSubscriptionIDRef = database.ref(
		`${internalURL}/braintreeSubscriptionID`
	);
	const planTrialEndRef = database.ref(`${internalURL}/planTrialEnd`);
	const stripeRef = database.ref(`${internalURL}/stripe`);

	const [appStoreReceipt, braintreeSubscriptionID, stripeData] =
		await Promise.all([
			appStoreReceiptRef.once('value').then(o => o.val() || ''),
			braintreeSubscriptionIDRef.once('value').then(o => o.val() || ''),
			stripeRef.once('value').then(o => o.val() || {})
		]);

	await Promise.all([
		removeAppStoreReceiptRef ? appStoreReceiptRef.remove() : undefined,
		braintreeIDRef.remove(),
		braintreeSubscriptionIDRef.remove(),
		planTrialEndRef.remove(),
		stripeRef.remove(),
		setItem(namespace, `users/${username}/plan`, CyphPlan, {
			plan: CyphPlans.Free
		})
	]);

	return {
		appStoreReceipt,
		braintreeSubscriptionID,
		stripe: stripeData
	};
});
