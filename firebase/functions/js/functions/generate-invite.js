import {configService as config, proto, util} from '@cyph/sdk';
import {mailchimpCredentials} from '../cyph-admin-vars.js';
import {sendMailInternal} from '../email.js';
import {
	addToMailingList,
	database,
	getInviteTemplateData,
	getItem,
	getTokenKey,
	mailchimp,
	onRequest,
	setItem,
	splitName,
	validateEmail,
	validateInput
} from '../init.js';
import namespaces from '../namespaces.js';
import tokens from '../tokens.js';

const {CyphPlan, CyphPlans} = proto;
const {readableID, titleize} = util;

export const generateInvite = onRequest(true, async (req, res, namespace) => {
	const {accountsURL} = namespaces[namespace];
	const appStoreReceipt = req.body.appStoreReceipt;
	const braintreeIDs = validateInput(
		(req.body.braintreeIDs || '').split('\n'),
		undefined,
		true
	);
	const braintreeSubscriptionIDs = validateInput(
		(req.body.braintreeSubscriptionIDs || '').split('\n'),
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
	let oldBraintreeSubscriptionID = '';

	if (username || userToken) {
		const braintreeID = braintreeIDs.shift();
		const braintreeSubscriptionID = braintreeSubscriptionIDs.shift();

		if (!username) {
			username = (await tokens.open(
				userToken,
				await getTokenKey(namespace)
			)).username;
		}

		const internalURL = `${namespace}/users/${username}/internal`;
		const appStoreReceiptRef = database.ref(
			`${internalURL}/appStoreReceipt`
		);
		const braintreeIDRef = database.ref(`${internalURL}/braintreeID`);
		const braintreeSubscriptionIDRef = database.ref(
			`${internalURL}/braintreeSubscriptionID`
		);
		const planTrialEndRef = database.ref(`${internalURL}/planTrialEnd`);
		const emailRef = database.ref(`${internalURL}/email`);

		const [
			_oldBraintreeSubscriptionID,
			userEmail,
			oldPlan
		] = await Promise.all([
			braintreeSubscriptionIDRef.once('value').then(o => o.val()),
			emailRef.once('value').then(o => o.val()),
			getItem(namespace, `users/${username}/plan`, CyphPlan)
				.catch(() => undefined)
				.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free))
		]);

		oldBraintreeSubscriptionID = _oldBraintreeSubscriptionID;

		const oldPlanConfig = config.planConfig[oldPlan];
		const isUpgrade = planConfig.rank > oldPlanConfig.rank;

		await Promise.all([
			setItem(namespace, `users/${username}/plan`, CyphPlan, {plan}),
			appStoreReceipt ?
				appStoreReceiptRef.set(appStoreReceipt) :
				appStoreReceiptRef.remove(),
			braintreeID ?
				braintreeIDRef.set(braintreeID) :
				braintreeIDRef.remove(),
			braintreeSubscriptionID ?
				braintreeSubscriptionIDRef.set(braintreeSubscriptionID) :
				braintreeSubscriptionIDRef.remove(),
			planTrialEndRef.remove(),
			(async () => {
				if (planConfig.initialInvites === undefined) {
					return;
				}

				const numInvites = Object.keys(
					(await database
						.ref(`${namespace}/users/${username}/inviteCodes`)
						.once('value')).val() || {}
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
			await sendMailInternal(
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
		const braintreeID = braintreeIDs.shift();
		const braintreeSubscriptionID = braintreeSubscriptionIDs.shift();

		const preexistingInviteCodeRef = database.ref(
			`${namespace}/inviteCodes/${preexistingInviteCode}`
		);
		const preexistingInviteCodeData = (await preexistingInviteCodeRef.once(
			'value'
		)).val();

		if (!preexistingInviteCodeData) {
			throw new Error(`Invalid invite code: ${preexistingInviteCode}.`);
		}

		await preexistingInviteCodeRef.set({
			...preexistingInviteCodeData,
			appStoreReceipt,
			braintreeID,
			braintreeSubscriptionID,
			plan
		});

		oldBraintreeSubscriptionID =
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
		[{braintreeIDs, braintreeSubscriptionIDs, plan}];

	const inviteCodeGroups = await Promise.all(
		planGroups.map(async planGroup => ({
			codes: await Promise.all(
				new Array(
					planGroup.quantity !== undefined ?
						planGroup.quantity :
					planGroup.braintreeIDs &&
						planGroup.braintreeSubscriptionIDs ?
						Math.min(
							planGroup.braintreeIDs.length,
							planGroup.braintreeSubscriptionIDs.length
						) :
						0
				)
					.fill(0)
					.map((_, i) =>
						planGroup.quantity === undefined &&
						planGroup.braintreeIDs &&
						planGroup.braintreeSubscriptionIDs ?
							[
								planGroup.braintreeIDs[i],
								planGroup.braintreeSubscriptionIDs[i]
							] :
							[]
					)
					.map(async ([braintreeID, braintreeSubscriptionID], i) => {
						const inviteCode = readableID(15);

						await Promise.all([
							database
								.ref(`${namespace}/inviteCodes/${inviteCode}`)
								.set({
									inviterUsername: '',
									plan: planGroup.plan,
									...(braintreeID ? {braintreeID} : {}),
									...(braintreeSubscriptionID ?
										{braintreeSubscriptionID} :
										{}),
									...(i === 0 && email ? {email} : {}),
									...(!isNaN(planGroup.planTrialEnd) ?
										{planTrialEnd: planGroup.planTrialEnd} :
										{})
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
							i === 0 &&
							email &&
							mailchimp &&
							mailchimpCredentials &&
							mailchimpCredentials.listIDs &&
							mailchimpCredentials.listIDs.pendingInvites ?
								addToMailingList(
									mailchimpCredentials.listIDs.pendingInvites,
									email,
									{
										FNAME: firstName,
										ICODE: inviteCode,
										LNAME: lastName,
										PLAN: CyphPlans[planGroup.plan],
										TRIAL: !!planGroup.planTrialEnd
									}
								)
									.then(async mailingListID =>
										database
											.ref(
												`${namespace}/pendingInvites/${inviteCode}`
											)
											.set(mailingListID)
									)
									.catch(() => {}) :
								undefined
						]);

						return inviteCode;
					})
			),
			planGroup
		}))
	);

	const inviteCodes = inviteCodeGroups
		.map(o => o.codes)
		.reduce((a, b) => a.concat(b), []);

	return {
		inviteCode: inviteCodes.length < 1 ? '' : inviteCodes[0],
		oldBraintreeSubscriptionID,
		welcomeLetter:
			inviteCodes.length < 1 ?
				'' :
				await sendMailInternal(
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
