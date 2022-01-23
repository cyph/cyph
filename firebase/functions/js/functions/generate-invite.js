import {configService as config, proto, util} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {getInviteTemplateData} from '../get-invite-template-data.js';
import {sendEmailInternal} from '../email.js';
import {database, getItem, getTokenKey, onRequest, setItem} from '../init.js';
import {addToMailingList, splitName} from '../mailchimp.js';
import {namespaces} from '../namespaces.js';
import {stripe} from '../stripe.js';
import * as tokens from '../tokens.js';
import {validateEmail, validateInput} from '../validation.js';

const {BooleanProto, CyphPlan, CyphPlans} = proto;
const {readableID, titleize} = util;

export const generateInvite = onRequest(true, async (req, res, namespace) => {
	const {accountsURL} = namespaces[namespace];
	const appStoreReceipt = req.body.appStoreReceipt;
	const customerIDs = validateInput(
		(req.body.customerIDs || '').split('\n'),
		undefined,
		true
	);
	const subscriptionIDs = validateInput(
		(req.body.subscriptionIDs || '').split('\n'),
		undefined,
		true
	);
	const subscriptionItemIDs = validateInput(
		(req.body.subscriptionItemIDs || '').split('\n'),
		undefined,
		true
	);
	const email = validateEmail(req.body.email, true);
	const giftPack = !!req.body.giftPack;
	const name = validateInput(req.body.name, undefined, true);
	let plan =
		req.body.plan in CyphPlans ? CyphPlans[req.body.plan] : CyphPlans.Free;
	const planConfig = config.planConfig[plan];
	const preexistingInviteCode = validateInput(
		req.body.inviteCode,
		undefined,
		true
	);
	const purchased = !!req.body.purchased;
	let username = validateInput(req.body.username, undefined, true);
	const userToken = validateInput(req.body.userToken, undefined, true);
	const useStripe = !!req.body.useStripe;
	let oldSubscriptionID = '';

	if (username || userToken) {
		const customerID = customerIDs.shift();
		const subscriptionID = subscriptionIDs.shift();
		const subscriptionItemID = subscriptionItemIDs.shift();

		if (!username) {
			username = (
				await tokens.open(userToken, await getTokenKey(namespace))
			).username;
		}

		const internalURL = `${namespace}/users/${username}/internal`;
		const appStoreReceiptRef = database.ref(
			`${internalURL}/appStoreReceipt`
		);
		const customerIDRef = database.ref(
			useStripe ?
				`${internalURL}/stripe/customerID` :
				`${internalURL}/braintreeID`
		);
		const subscriptionIDRef = database.ref(
			useStripe ?
				`${internalURL}/stripe/subscriptionID` :
				`${internalURL}/braintreeSubscriptionID`
		);
		const subscriptionItemIDRef = useStripe ?
			database.ref(`${internalURL}/stripe/subscriptionItemID`) :
			undefined;
		const planTrialEndRef = database.ref(`${internalURL}/planTrialEnd`);
		const emailRef = database.ref(`${internalURL}/email`);

		const [_oldSubscriptionID, userEmail, oldPlan] = await Promise.all([
			subscriptionIDRef.once('value').then(o => o.val()),
			emailRef.once('value').then(o => o.val()),
			getItem(namespace, `users/${username}/plan`, CyphPlan)
				.catch(() => undefined)
				.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free))
		]);

		oldSubscriptionID = _oldSubscriptionID;

		const oldPlanConfig = config.planConfig[oldPlan];
		const isUpgrade = planConfig.rank > oldPlanConfig.rank;

		await Promise.all([
			setItem(namespace, `users/${username}/plan`, CyphPlan, {plan}),
			appStoreReceipt ?
				appStoreReceiptRef.set(appStoreReceipt) :
				appStoreReceiptRef.remove(),
			customerID ? customerIDRef.set(customerID) : customerIDRef.remove(),
			subscriptionID ?
				subscriptionIDRef.set(subscriptionID) :
				subscriptionIDRef.remove(),
			!subscriptionItemIDRef ?
				undefined :
			subscriptionItemID ?
				subscriptionItemIDRef.set(subscriptionItemID) :
				subscriptionItemIDRef.remove(),
			planTrialEndRef.remove(),
			useStripe && subscriptionItemID ?
				stripe.subscriptionItems
					.update(subscriptionItemID, {
						metadata: {username}
					})
					.catch(() => {}) :
				undefined,
			(async () => {
				if (planConfig.initialInvites === undefined) {
					return;
				}

				const numInvites = Object.keys(
					(
						await database
							.ref(`${namespace}/users/${username}/inviteCodes`)
							.once('value')
					).val() || {}
				).length;

				if (numInvites >= planConfig.initialInvites) {
					return;
				}

				return Promise.all(
					new Array(planConfig.initialInvites - numInvites)
						.fill('')
						.map(() => readableID(15))
						.map(async code =>
							Promise.all([
								database
									.ref(`${namespace}/inviteCodes/${code}`)
									.set({
										inviterUsername: username
									}),
								setItem(
									namespace,
									`users/${username}/inviteCodes/${code}`,
									BooleanProto,
									true
								)
							])
						)
				);
			})()
		]);

		if (userEmail) {
			await sendEmailInternal(
				userEmail,
				isUpgrade ? 'Cyph Status Upgrade!' : 'Your Cyph Status',
				{
					data: getInviteTemplateData({
						gift: giftPack,
						name,
						oldPlan,
						plan
					}),
					namespace,
					noUnsubscribe: true,
					templateName: 'new-cyph-invite'
				}
			);
		}
	}

	if (preexistingInviteCode) {
		const customerID = customerIDs.shift();
		const subscriptionID = subscriptionIDs.shift();
		const subscriptionItemID = subscriptionItemIDs.shift();

		const preexistingInviteCodeRef = database.ref(
			`${namespace}/inviteCodes/${preexistingInviteCode}`
		);
		const preexistingInviteCodeData = (
			await preexistingInviteCodeRef.once('value')
		).val();

		if (!preexistingInviteCodeData) {
			throw new Error(`Invalid invite code: ${preexistingInviteCode}.`);
		}

		await preexistingInviteCodeRef.set({
			...preexistingInviteCodeData,
			...(useStripe ?
				{stripe: {customerID, subscriptionID, subscriptionItemID}} :
				{
					braintreeID: customerID,
					braintreeSubscriptionID: subscriptionID
				}),
			appStoreReceipt,
			plan
		});

		oldSubscriptionID = useStripe ?
			(preexistingInviteCodeData.stripe || {}).subscriptionID :
			preexistingInviteCodeData.braintreeSubscriptionID;
	}

	const {firstName, lastName} = splitName(name);

	const isPlanGroupPurchase = req.body.plan.startsWith('[');

	const planGroups = isPlanGroupPurchase ?
		JSON.parse(req.body.plan).map(o => ({
			plan: o.plan in CyphPlans ? CyphPlans[o.plan] : CyphPlans.Free,
			planTrialEnd:
				!isNaN(o.trialMonths) && o.trialMonths > 0 ?
					new Date().setMonth(new Date().getMonth() + o.trialMonths) :
					undefined,
			quantity: !isNaN(o.quantity) && o.quantity > 0 ? o.quantity : 1,
			trialMonths:
				!isNaN(o.trialMonths) && o.trialMonths > 0 ?
					o.trialMonths :
					undefined
		})) :
		[{customerIDs, plan, subscriptionIDs, subscriptionItemIDs}];

	const inviteCodeGroups = await Promise.all(
		planGroups.map(async planGroup => ({
			codes: await Promise.all(
				new Array(
					planGroup.quantity !== undefined ?
						planGroup.quantity :
					planGroup.customerIDs && planGroup.subscriptionIDs ?
						Math.min(
							planGroup.customerIDs.length,
							planGroup.subscriptionIDs.length
						) :
						0
				)
					.fill(0)
					.map((_, i) =>
						planGroup.quantity === undefined &&
						planGroup.customerIDs &&
						planGroup.subscriptionIDs ?
							[
								planGroup.customerIDs[i],
								planGroup.subscriptionIDs[i],
								(planGroup.subscriptionItemIDs || [])[i]
							] :
							[]
					)
					.map(
						async (
							[customerID, subscriptionID, subscriptionItemID],
							i
						) => {
							const inviteCode = readableID(15);

							await Promise.all([
								database
									.ref(
										`${namespace}/inviteCodes/${inviteCode}`
									)
									.set({
										...(useStripe ?
											{
												stripe: {
													customerID,
													subscriptionID,
													subscriptionItemID
												}
											} :
											{
												braintreeID: customerID,
												braintreeSubscriptionID:
													subscriptionID
											}),
										...(i === 0 && email ? {email} : {}),
										...(!isNaN(planGroup.planTrialEnd) ?
											{
												planTrialEnd:
													planGroup.planTrialEnd
											} :
											{}),
										inviterUsername: '',
										plan: planGroup.plan
									}),
								email ?
									database
										.ref(
											`${namespace}/inviteCodeEmailAddresses/${Buffer.from(
												email
											).toString('hex')}/${inviteCode}`
										)
										.set({inviterUsername: ''}) :
									undefined,
								useStripe && subscriptionItemID ?
									stripe.subscriptionItems
										.update(subscriptionItemID, {
											metadata: {inviteCode}
										})
										.catch(() => {}) :
									undefined,
								i === 0 &&
									addToMailingList(
										mailchimpCredentials?.listIDs
											?.pendingInvites,
										email,
										{
											FNAME: firstName,
											ICODE: inviteCode,
											LNAME: lastName,
											PLAN: CyphPlans[planGroup.plan],
											TRIAL: planGroup.planTrialEnd ?
												'true' :
												''
										}
									)
										.then(async () =>
											database
												.ref(
													`${namespace}/pendingInvites/${inviteCode}`
												)
												.set(email)
										)
										.catch(() => {})
							]);

							return inviteCode;
						}
					)
			),
			planGroup
		}))
	);

	const inviteCodes = inviteCodeGroups
		.map(o => o.codes)
		.reduce((a, b) => a.concat(b), []);

	return {
		inviteCode: inviteCodes.length < 1 ? '' : inviteCodes[0],
		oldSubscriptionID,
		welcomeLetter:
			inviteCodes.length < 1 ?
				'' :
				await sendEmailInternal(
					email,
					(purchased ?
						'Cyph Purchase Confirmation' :
						"You've Been Invited to Cyph!") +
						(giftPack ?
							' (Gift Pack)' :
						plan === CyphPlans.Free ?
							'' :
							/*
							planTrialEnd ?
							` (with ${titleize(CyphPlans[plan])} trial)` :
							*/
							` (${titleize(CyphPlans[plan])})`),
					{
						data: getInviteTemplateData({
							...(isPlanGroupPurchase ?
								{inviteCodeGroups} :
							inviteCodes.length < 2 ?
								{inviteCode: inviteCodes[0]} :
								{inviteCodes}),
							gift: giftPack,
							name,
							plan,
							purchased
						}),
						namespace,
						noUnsubscribe: true,
						templateName: 'new-cyph-invite'
					}
				)
	};
});
