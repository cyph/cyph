import {database, getTokenKey, onRequest} from '../init.js';
import {namespaces} from '../namespaces.js';
import * as tokens from '../tokens.js';
import {validateInput} from '../validation.js';

export const getBraintreeSubscriptionID = onRequest(
	true,
	async (req, res, namespace) => {
		const {accountsURL} = namespaces[namespace];
		const userToken = validateInput(req.body.userToken);

		const {username} = await tokens.open(
			userToken,
			await getTokenKey(namespace)
		);

		const internalURL = `${namespace}/users/${username}/internal`;

		const appStoreReceiptRef = database.ref(
			`${internalURL}/appStoreReceipt`
		);
		const braintreeSubscriptionIDRef = database.ref(
			`${internalURL}/braintreeSubscriptionID`
		);

		const [appStoreReceipt, braintreeSubscriptionID] = await Promise.all([
			appStoreReceiptRef.once('value').then(o => o.val() || ''),
			braintreeSubscriptionIDRef.once('value').then(o => o.val() || '')
		]);

		const planTrialEndRef = database.ref(`${internalURL}/planTrialEnd`);
		const planTrialEnd = (await planTrialEndRef.once('value')).val() || 0;

		return {appStoreReceipt, braintreeSubscriptionID, planTrialEnd};
	}
);
