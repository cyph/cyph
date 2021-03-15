import {configService as config, proto, util} from '@cyph/sdk';
import firebaseFunctions from 'firebase-functions';
import fs from 'fs';
import MailchimpApiV3 from 'mailchimp-api-v3';
import usernameBlacklistArray from 'username-blacklist';
import {getMeta} from './base.js';
import {cyphAdminKey, mailchimpCredentials} from './cyph-admin-vars.js';
import {initDatabaseService} from './database-service.js';
import {emailRegex} from './email-regex.js';
import {initMailchimp} from './mailchimp.js';
import {namespaces} from './namespaces.js';
import {initNotify} from './notify.js';
import {initTokenKey} from './token-key.js';

const {__dirname} = getMeta(import.meta);
const {CyphPlans, CyphPlanTypes} = proto;
const {
	dynamicDeserialize,
	dynamicSerialize,
	normalize,
	readableByteLength,
	titleize
} = util;

export const usernameBlacklist = new Set(usernameBlacklistArray);

export const mailchimp =
	mailchimpCredentials && mailchimpCredentials.apiKey ?
		new MailchimpApiV3(mailchimpCredentials.apiKey) :
		undefined;

export const {
	admin,
	auth,
	database,
	getHash,
	getItem,
	getOrSetDefaultSimple,
	hasItem,
	messaging,
	pushItem,
	removeItem,
	setItem,
	setItemInternal,
	storage
} = initDatabaseService(
	{
		...firebaseFunctions.config(),
		fcmServerKey: fs
			.readFileSync(__dirname + '/fcm-server-key')
			.toString()
			.trim()
	},
	true
);

export const {
	addToMailingList,
	removeFromMailingList,
	splitName
} = initMailchimp(mailchimp, mailchimpCredentials);

export const {getTokenKey} = initTokenKey(database);

export const {notify} = initNotify(database, messaging);

export const channelDisconnectTimeout = 30000;

export const getFullBurnerBaseURL = (
	namespace,
	callType,
	telehealth = false,
	removeHash = false
) => {
	const {
		burnerURL,
		burnerAudioURL,
		burnerVideoURL,
		telehealthBurnerURL,
		telehealthBurnerAudioURL,
		telehealthBurnerVideoURL
	} = namespaces[namespace];

	const fullBurnerURL = telehealth ?
		callType === 'audio' ?
			telehealthBurnerAudioURL :
		callType === 'video' ?
			telehealthBurnerVideoURL :
			telehealthBurnerURL :
	callType === 'audio' ?
		burnerAudioURL :
	callType === 'video' ?
		burnerVideoURL :
		burnerURL;

	return removeHash ? fullBurnerURL.replace('#', '') : fullBurnerURL;
};

export const getBurnerLink = (
	namespace,
	id,
	username,
	callType,
	telehealth = false
) =>
	`${getFullBurnerBaseURL(namespace, callType, telehealth, !!username)}${
		username ? `${username}/` : ''
	}${validateInput(id, /^[A-Za-z0-9_-]+(\.\d{4})?$/)}`;

export const getRealUsername = async (namespace, username) => {
	if (!username) {
		return 'unregistered';
	}

	try {
		const realUsername = (await database
			.ref(`${namespace}/users/${username}/internal/realUsername`)
			.once('value')).val();
		if (realUsername) {
			return realUsername;
		}
	}
	catch (_) {}

	return username;
};

export const getName = async (namespace, username) => {
	if (!username) {
		return 'Someone';
	}

	try {
		const name = (await database
			.ref(`${namespace}/users/${username}/internal/name`)
			.once('value')).val();
		if (name) {
			return name;
		}
	}
	catch (_) {}

	return getRealUsername(namespace, username);
};

export const getInviteTemplateData = ({
	gift,
	inviteCode,
	inviteCodeGroups,
	inviteCodes,
	inviterName,
	name,
	oldPlan,
	plan,
	purchased,
	fromApp
}) => {
	const planConfig =
		config.planConfig[plan] || config.planConfig[CyphPlans.Free];
	const oldPlanConfig =
		oldPlan !== undefined ? config.planConfig[oldPlan] : undefined;
	const isUpgrade =
		oldPlanConfig !== undefined && planConfig.rank > oldPlanConfig.rank;

	return {
		...planConfig,
		...(oldPlan === undefined ?
			{} :
			{
				oldPlan: titleize(CyphPlans[oldPlan]),
				planChange: true,
				planChangeUpgrade: isUpgrade
			}),
		fromApp,
		gift,
		inviteCode,
		inviteCodeGroups:
			inviteCodeGroups !== undefined ?
				inviteCodeGroups
					.map(({codes, planGroup}) => ({
						codes: codes || [],
						plan: titleize(
							isNaN(planGroup.trialMonths) ||
								planGroup.trialMonths < 1 ?
								CyphPlans[planGroup.plan] :
								CyphPlans[planGroup.plan].replace(
									/^(Annual|Monthly)/,
									''
								)
						),
						trialDuration:
							isNaN(planGroup.trialMonths) ||
							planGroup.trialMonths < 1 ?
								undefined :
							planGroup.trialMonths < 12 ?
								`${Math.floor(
									planGroup.trialMonths
								)} Months`.replace('1 Months', '1 Month') :
								`${Math.floor(
									planGroup.trialMonths / 12
								)} Years`.replace('1 Years', '1 Year')
					}))
					.filter(o => o.codes.length > 0) :
				undefined,
		inviteCodes,
		inviterName,
		name,
		planAnnualBusiness: plan === CyphPlans.AnnualBusiness,
		planAnnualTelehealth: plan === CyphPlans.AnnualTelehealth,
		planFoundersAndFriends:
			planConfig.planType === CyphPlanTypes.FoundersAndFriends,
		planFoundersAndFriendsTelehealth:
			planConfig.planType === CyphPlanTypes.FoundersAndFriends_Telehealth,
		planFree: planConfig.planType === CyphPlanTypes.Free,
		planMonthlyBusiness: plan === CyphPlans.MonthlyBusiness,
		planMonthlyTelehealth: plan === CyphPlans.MonthlyTelehealth,
		planPlatinum: planConfig.planType === CyphPlanTypes.Platinum,
		planPremium: planConfig.planType === CyphPlanTypes.Premium,
		planSupporter: planConfig.planType === CyphPlanTypes.Supporter,
		platinumFeatures: planConfig.usernameMinLength === 1,
		purchased,
		storageCap: readableByteLength(planConfig.storageCapGB, 'gb')
	};
};

export const getSMSCredentials = async (namespace, username) => {
	try {
		if (!username) {
			return;
		}

		return (await database
			.ref(
				`${namespace.replace(
					/\./g,
					'_'
				)}/users/${username}/internal/smsCredentials`
			)
			.once('value')).val();
	}
	catch {}
};

export const getURL = (adminRef, namespace) => {
	const url = adminRef
		.toString()
		.split(
			`${adminRef.root.toString()}${namespace ? `${namespace}/` : ''}`
		)[1];

	if (!url) {
		throw new Error('Cannot get URL from input.');
	}

	return url;
};

export const isUsernameBlacklisted = async (
	namespace,
	username,
	reservedUsername
) =>
	!(reservedUsername && username === normalize(reservedUsername)) &&
	(usernameBlacklist.has(username) ||
		(await database
			.ref(`${namespace}/reservedUsernames/${username}`)
			.once('value')).exists());

export const validateInput = (input, regex, optional) => {
	if (!input && optional) {
		return;
	}

	if (!input || input.indexOf('/') > -1 || (regex && !regex.test(input))) {
		throw new Error('Invalid data.');
	}

	return input;
};

export const validateEmail = (email, optional) =>
	validateInput((email || '').trim().toLowerCase(), emailRegex, optional);

export const onCall = f => async (req, res) => {
	try {
		if (req.get('X-Warmup-Ping')) {
			res.status(200).send('');
			return;
		}

		const idToken = req.get('Authorization');
		const data = dynamicDeserialize(req.body);

		const result = await f(
			data,
			validateInput(data.namespace.replace(/\./g, '_')),
			async () =>
				idToken ?
					normalize(
						(await auth.verifyIdToken(idToken)).email.split('@')[0]
					) :
					undefined,
			data.testEnvName
		);

		res.status(200).send(dynamicSerialize({result}));
	}
	catch (err) {
		console.error(err);
		res.status(200).send(
			dynamicSerialize({
				err: !err ? true : err.message ? err.message : err.toString()
			})
		);
	}
};

export const onRequest = (adminOnly, f) => async (req, res) => {
	try {
		if (req.get('X-Warmup-Ping')) {
			res.status(200).send('');
			return;
		}

		if (adminOnly && req.get('Authorization') !== cyphAdminKey) {
			throw new Error('Invalid authorization.');
		}

		const returnValue = await f(
			req,
			res,
			validateInput(req.body.namespace.replace(/\./g, '_'))
		);

		res.status(200).send(returnValue !== undefined ? returnValue : '');
	}
	catch (err) {
		console.error(err);
		res.status(500).send({error: true});
	}
};
