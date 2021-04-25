#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {configService as config, proto, util} from '@cyph/sdk';
import {initDatabaseService} from '../modules/database-service.js';
import {sendEmail} from './email.js';
import {cancelSubscriptions} from './subscriptions.js';

const {CyphPlan, CyphPlans, CyphPlanTypes} = proto;
const {readableByteLength, normalize, readableID, titleize} = util;

export const changeUserPlan = async (
	projectId,
	username,
	plan,
	trialMonths,
	paymentInfo,
	namespace
) => {
	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}
	if (!(plan in CyphPlans)) {
		throw new Error(`Plan "${plan}" not found.`);
	}

	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	const namespacePath = namespace.replace(/\./g, '_');

	paymentInfo =
		paymentInfo && typeof paymentInfo === 'string' ?
			JSON.parse(paymentInfo) :
			paymentInfo;
	paymentInfo =
		paymentInfo &&
		typeof paymentInfo === 'object' &&
		Object.keys(paymentInfo).length > 0 ?
			paymentInfo :
			undefined;

	trialMonths =
		!trialMonths || paymentInfo ?
			undefined :
		typeof trialMonths === 'number' ?
			trialMonths :
			parseInt(trialMonths, 10);
	trialMonths =
		typeof trialMonths === 'number' && trialMonths > 0 ?
			trialMonths :
			undefined;

	username = normalize(username);

	const {
		auth,
		database,
		getItem,
		removeItem,
		setItem,
		storage
	} = initDatabaseService(projectId);

	const cyphPlan = CyphPlans[plan];

	const appStoreReceiptRef = database.ref(
		`${namespacePath}/users/${username}/internal/appStoreReceipt`
	);

	const braintreeIDRef = database.ref(
		`${namespacePath}/users/${username}/internal/braintreeID`
	);

	const braintreeSubscriptionIDRef = database.ref(
		`${namespacePath}/users/${username}/internal/braintreeSubscriptionID`
	);

	const stripeRef = database.ref(
		`${namespacePath}/users/${username}/internal/stripe`
	);

	const [email, name, oldPlan, oldPaymentInfo] = await Promise.all([
		database
			.ref(`${namespacePath}/users/${username}/internal/email`)
			.once('value')
			.then(o => o.val()),
		database
			.ref(`${namespacePath}/users/${username}/internal/name`)
			.once('value')
			.then(o => o.val()),
		getItem(namespace, `users/${username}/plan`, CyphPlan)
			.then(o => o.plan)
			.catch(() => CyphPlans.Free),
		Promise.all([
			appStoreReceiptRef.once('value').then(o => o.val()),
			braintreeIDRef.once('value').then(o => o.val()),
			braintreeSubscriptionIDRef.once('value').then(o => o.val()),
			stripeRef.once('value').then(o => o.val())
		]).then(
			([
				appStoreReceipt,
				braintreeID,
				braintreeSubscriptionID,
				stripe
			]) => ({
				appStoreReceipt,
				braintreeID,
				braintreeSubscriptionID,
				stripe
			})
		)
	]);

	if (cyphPlan === oldPlan) {
		throw new Error(`User already has plan "${plan}".`);
	}

	await cancelSubscriptions({
		apple:
			oldPaymentInfo.appStoreReceipt &&
			oldPaymentInfo.appStoreReceipt !== paymentInfo.appStoreReceipt ?
				oldPaymentInfo.appStoreReceipt :
				undefined,
		braintree:
			oldPaymentInfo.braintreeSubscriptionID &&
			oldPaymentInfo.braintreeSubscriptionID !==
				paymentInfo.braintreeSubscriptionID ?
				oldPaymentInfo.braintreeSubscriptionID :
				undefined,
		stripe:
			oldPaymentInfo.stripe &&
			oldPaymentInfo.stripe.subscriptionItemID &&
			oldPaymentInfo.stripe.subscriptionItemID !==
				(paymentInfo.stripe || {}).subscriptionItemID ?
				oldPaymentInfo.stripe.subscriptionItemID :
				undefined
	});

	const planConfig = config.planConfig[cyphPlan];
	const oldPlanConfig = config.planConfig[oldPlan];
	const isUpgrade = planConfig.rank > oldPlanConfig.rank;

	const planTrialEndRef = database.ref(
		`${namespacePath}/users/${username}/internal/planTrialEnd`
	);

	await Promise.all([
		setItem(namespace, `users/${username}/plan`, CyphPlan, {
			plan: cyphPlan
		}),
		paymentInfo.appStoreReceipt ?
			appStoreReceiptRef.set(paymentInfo.appStoreReceipt) :
			appStoreReceiptRef.remove(),
		paymentInfo.braintreeID ?
			braintreeIDRef.set(paymentInfo.braintreeID) :
			braintreeIDRef.remove(),
		paymentInfo.braintreeSubscriptionID ?
			braintreeSubscriptionIDRef.set(
				paymentInfo.braintreeSubscriptionID
			) :
			braintreeSubscriptionIDRef.remove(),
		paymentInfo.stripe ?
			stripeRef.set(paymentInfo.stripe) :
			stripeRef.remove(),
		database
			.ref(`${namespacePath}/users/${username}/internal/planTrialEnd`)
			.remove(),
		trialMonths ?
			planTrialEndRef.set(
				new Date().setMonth(new Date().getMonth() + trialMonths)
			) :
			planTrialEndRef.remove(),
		(async () => {
			if (planConfig.initialInvites === undefined) {
				return;
			}

			const numInvites = Object.keys(
				(await database
					.ref(`${namespacePath}/users/${username}/inviteCodes`)
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
								.ref(`${namespacePath}/inviteCodes/${code}`)
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

	if (email) {
		await sendEmail(
			!email ? undefined : !name ? email : `${name} <${email}>`,
			!isUpgrade ?
				'Your Cyph Status' :
				'Cyph Status Upgrade!' +
					(!trialMonths ?
						'' :
						` (${trialMonths.toString()}-month trial)`),
			{
				data: {
					...planConfig,
					name,
					oldPlan: titleize(CyphPlans[oldPlan]),
					planAnnualBusiness: cyphPlan === CyphPlans.AnnualBusiness,
					planAnnualTelehealth:
						cyphPlan === CyphPlans.AnnualTelehealth,
					planChange: true,
					planChangeUpgrade: isUpgrade,
					planFoundersAndFriends:
						planConfig.planType ===
						CyphPlanTypes.FoundersAndFriends,
					planFoundersAndFriendsTelehealth:
						planConfig.planType ===
						CyphPlanTypes.FoundersAndFriends_Telehealth,
					planFree: planConfig.planType === CyphPlanTypes.Free,
					planMonthlyBusiness: cyphPlan === CyphPlans.MonthlyBusiness,
					planMonthlyTelehealth:
						cyphPlan === CyphPlans.MonthlyTelehealth,
					planPlatinum:
						planConfig.planType === CyphPlanTypes.Platinum,
					planPremium: planConfig.planType === CyphPlanTypes.Premium,
					planSupporter:
						planConfig.planType === CyphPlanTypes.Supporter,
					platinumFeatures: planConfig.usernameMinLength === 1,
					storageCap: readableByteLength(
						planConfig.storageCapGB,
						'gb'
					)
				},
				templateName: 'new-cyph-invite'
			},
			undefined,
			undefined,
			accountsURL
		);
	}

	return CyphPlans[cyphPlan];
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];

		for (const {
			username,
			plan,
			trialMonths,
			paymentInfo,
			namespace
		} of process.argv[3] === '--users' ?
			JSON.parse(process.argv[4]).map(username => ({
				username,
				plan: process.argv[5],
				trialMonths: process.argv[6],
				paymentInfo: process.argv[7],
				namespace: process.argv[8]
			})) :
			[
				{
					username: process.argv[3],
					plan: process.argv[4],
					trialMonths: process.argv[5],
					paymentInfo: process.argv[6],
					namespace: process.argv[7]
				}
			]) {
			console.log(
				`Granted ${username} status ${await changeUserPlan(
					projectId,
					username,
					plan,
					trialMonths,
					paymentInfo,
					namespace
				)}`
			);
		}

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
