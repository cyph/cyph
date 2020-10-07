const cors = require('cors')({origin: true});
const functions = require('firebase-functions');
const fs = require('fs');
const {phoneNumberTimezone} = require('phone-number-timezone');
const usernameBlacklist = new Set(require('username-blacklist'));
const {config} = require('./config');
const {cyphAdminKey, mailchimpCredentials} = require('./cyph-admin-vars');
const {sendMail, sendMailInternal} = require('./email');
const {from: cyphFromEmail} = require('./email-credentials');
const {emailRegex} = require('./email-regex');
const {renderTemplate} = require('./markdown-templating');
const namespaces = require('./namespaces');
const {sendSMS} = require('./sms');
const tokens = require('./tokens');

const mailchimp =
	mailchimpCredentials && mailchimpCredentials.apiKey ?
		new (require('mailchimp-api-v3'))(mailchimpCredentials.apiKey) :
		undefined;

const databaseService = require('./database-service')(
	{
		...functions.config(),
		fcmServerKey: fs
			.readFileSync(__dirname + '/fcm-server-key')
			.toString()
			.trim()
	},
	true
);

const {
	admin,
	auth,
	database,
	getHash,
	getItem,
	hasItem,
	messaging,
	pushItem,
	removeItem,
	setItem,
	setItemInternal,
	storage
} = databaseService;

const {
	addToMailingList,
	removeFromMailingList,
	splitName
} = require('./mailchimp')(mailchimp, mailchimpCredentials);

const {getTokenKey} = require('./token-key')(database);

const {
	AccountContactState,
	AccountFileRecord,
	AccountNotification,
	AccountUserProfile,
	BinaryProto,
	CyphPlan,
	CyphPlans,
	CyphPlanTypes,
	NotificationTypes,
	NumberProto,
	StringProto
} = require('./proto');

const {
	dynamicDeserialize,
	dynamicSerialize,
	normalize,
	normalizeArray,
	readableByteLength,
	readableID,
	sleep,
	titleize,
	uuid
} = require('./util');

const {notify} = require('./notify')(database, messaging);

const channelDisconnectTimeout = 30000;

const getFullBurnerURL = (
	namespace,
	callType,
	telehealth,
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

const getRealUsername = async (namespace, username) => {
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

const getName = async (namespace, username) => {
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

const getInviteTemplateData = ({
	inviteCode,
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
		inviteCode,
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

const getURL = (adminRef, namespace) => {
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

const usernameBlacklisted = async (namespace, username, reservedUsername) =>
	!(reservedUsername && username === normalize(reservedUsername)) &&
	(usernameBlacklist.has(username) ||
		(await database
			.ref(`${namespace}/reservedUsernames/${username}`)
			.once('value')).exists());

const validateInput = (input, regex, optional) => {
	if (!input && optional) {
		return;
	}

	if (!input || input.indexOf('/') > -1 || (regex && !regex.test(input))) {
		throw new Error('Invalid data.');
	}

	return input;
};

const validateEmail = (email, optional) =>
	validateInput((email || '').trim().toLowerCase(), emailRegex, optional);

const onCall = f =>
	functions.https.onRequest((req, res) =>
		cors(req, res, async () => {
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
								(await auth.verifyIdToken(idToken)).email.split(
									'@'
								)[0]
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
						err: !err ?
							true :
						err.message ?
							err.message :
							err.toString()
					})
				);
			}
		})
	);

const onRequest = (adminOnly, f) =>
	functions.https.onRequest((req, res) =>
		cors(req, res, async () => {
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

				res.status(200).send(
					returnValue !== undefined ? returnValue : ''
				);
			}
			catch (err) {
				console.error(err);
				res.status(500).send({error: true});
			}
		})
	);

exports.acceptPseudoRelationship = onCall(
	async (data, namespace, getUsername) => {
		const id = validateInput(data.id);
		const relationshipRef = database.ref(
			`${namespace}/pseudoRelationships/${id}`
		);

		const [relationshipVal, bob] = await Promise.all([
			relationshipRef.once('value').then(o => o.val()),
			getUsername()
		]);

		const bobNameRef = database.ref(
			`${namespace}/users/${bob}/internal/name`
		);

		const alice = relationshipVal.aliceUsername;
		const email = relationshipVal.bobEmail;
		const name = relationshipVal.bobName;

		if (!alice || !bob || !email || !name) {
			throw new Error('Users not found.');
		}

		await Promise.all([
			relationshipRef.remove(),
			removeItem(namespace, `users/${alice}/contacts/${id}`),
			setItem(
				namespace,
				`users/${alice}/contacts/${bob}`,
				AccountContactState,
				{email, name, state: AccountContactState.States.Confirmed}
			),
			setItem(
				namespace,
				`users/${bob}/contacts/${alice}`,
				AccountContactState,
				{state: AccountContactState.States.Confirmed}
			),
			hasItem(namespace, `users/${bob}/email`).then(async hasEmail =>
				hasEmail ?
					undefined :
					setItem(namespace, `users/${bob}/email`, StringProto, email)
			),
			bobNameRef
				.once('value')
				.then(o => o.val())
				.then(async oldBobName =>
					!oldBobName || oldBobName === bob ?
						bobNameRef.set(name) :
						undefined
				),
			getName(namespace, alice).then(async aliceName =>
				notify(
					namespace,
					alice,
					`${titleize(contactString)} Confirmation from ${email}`,
					{
						data: {aliceName, name},
						templateName: 'external-contact-accept'
					}
				)
			)
		]);

		return alice;
	}
);

exports.appointmentInvite = onCall(async (data, namespace, getUsername) => {
	const {accountsURL} = namespaces[namespace];

	const accountBurnerID = (
		(data.eventDetails && data.eventDetails.uid) ||
		''
	).trim();

	if (!accountBurnerID) {
		throw new Error('Missing UID.');
	}

	const inviterUsername = await getUsername();
	const telehealth = !!data.telehealth;
	const uid = `${inviterUsername}-${accountBurnerID}@cyph.com`;

	const members = ((data.to || {}).members || [])
		.map(o => ({
			email: (o.email || '').trim(),
			id: (o.id || '').trim(),
			name: (o.name || '').trim(),
			phoneNumber: (o.phoneNumber || '').trim()
		}))
		.filter(
			o =>
				o.id.length === config.cyphIDLength &&
				(o.email || o.phoneNumber)
		);

	if (members.length < 1) {
		throw new Error('No recipients specified.');
	}

	const singleRecipient = members.length === 1 ? members[0] : undefined;

	const inviterLink = `${accountsURL}account-burner/${accountBurnerID}`;

	const startTimeString = timeZone => {
		if (!timeZone) {
			timeZone = data.inviterTimeZone || 'UTC';
		}

		try {
			return new Intl.DateTimeFormat('en-US', {
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				month: 'long',
				timeZone,
				timeZoneName: 'long',
				year: 'numeric'
			}).format(new Date(data.eventDetails.startTime));
		}
		catch (err) {
			if (timeZone !== 'UTC') {
				return startTimeString('UTC');
			}

			throw err;
		}
	};

	const messagePart1 = `Cyph appointment with \${PARTY} is scheduled for ${Math.floor(
		(data.eventDetails.endTime - data.eventDetails.startTime) / 60000
	)} minutes at \${START_TIME}`;

	const messagePart2 = `At the scheduled time, join here: \${LINK}`;

	const messageAddendumEmail = `You may also add the attached invitation to your calendar.`;

	const memberListToShare = data.shareMemberList ?
		members
			.map(o =>
				!data.shareMemberContactInfo ?
					o.name :
				!o.name ?
					o.email || o.phoneNumber :
					`${o.name} <${o.email || o.phoneNumber}>`
			)
			.filter(s => s) :
		[];

	const messageAddendumMembers =
		memberListToShare.length > 0 ?
			`\n\nThe following parties are invited to join:\n\n${memberListToShare.join(
				'\n'
			)}` :
			'';

	const smsCredentials = await (async () =>
		members.find(o => o.phoneNumber) ?
			(await database
				.ref(
					`${namespace}/users/${inviterUsername}/internal/smsCredentials`
				)
				.once('value')).val() :
			undefined)().catch(() => undefined);

	await Promise.all([
		sendMail(
			database,
			namespace,
			inviterUsername,
			`Cyph Appointment${
				!singleRecipient ?
					'' :
					` with ${
						!singleRecipient.name ?
							singleRecipient.email ||
							singleRecipient.phoneNumber :
							`${singleRecipient.name} <${singleRecipient.email ||
								singleRecipient.phoneNumber}>`
					}`
			}`,
			`${messagePart1
				.replace(' with ${PARTY}', '')
				.replace(
					'${START_TIME}',
					startTimeString()
				)}.\n\n${messagePart2.replace(
				'${LINK}',
				inviterLink
			)}\n\n${messageAddendumEmail}${messageAddendumMembers}`,
			{
				attendees: members,
				cancel: !!data.eventDetails.cancel,
				endTime: data.eventDetails.endTime,
				location: inviterLink,
				startTime: data.eventDetails.startTime,
				uid
			}
		),
		Promise.all(
			members.map(async o => {
				const emailTo = {email: o.email, name: o.name};

				const inviteeLink = `${getFullBurnerURL(
					namespace,
					data.callType,
					telehealth,
					true
				)}${inviterUsername}/${o.id}`;

				const inviteeMessagePart1 = messagePart1
					.replace('${PARTY}', `@${inviterUsername}`)
					.replace(
						'${START_TIME}',
						startTimeString(
							o.phoneNumber ?
								await phoneNumberTimezone(o.phoneNumber) :
								undefined
						)
					);

				const inviteeMessagePart2 = messagePart2.replace(
					'${LINK}',
					inviteeLink
				);

				return Promise.all([
					o.email &&
						sendMail(
							database,
							namespace,
							emailTo,
							`Cyph Appointment with @${inviterUsername}`,
							{
								markdown: `${inviteeMessagePart1}.\n\n${inviteeMessagePart2}\n\n${messageAddendumEmail}${messageAddendumMembers}`,
								noUnsubscribe: true
							},
							{
								attendees: members,
								cancel: !!data.eventDetails.cancel,
								endTime: data.eventDetails.endTime,
								inviterUsername: emailTo,
								location: inviteeLink,
								startTime: data.eventDetails.startTime,
								uid
							}
						),
					o.phoneNumber &&
						sendSMS(
							o.phoneNumber,
							inviteeMessagePart1,
							smsCredentials
						).then(async () =>
							sendSMS(
								o.phoneNumber,
								inviteeMessagePart2,
								smsCredentials
							)
						)
				]);
			})
		)
	]);
});

/*
TODO: Re-enable after edge case false positives are fixed

exports.channelDisconnect = functions.database
	.ref('/{namespace}/channels/{channel}/disconnects/{user}')
	.onWrite(async ({after: data}, {params}) => {
		if (!data.exists()) {
			return;
		}

		const startingValue = data.val();

		await sleep(
			Math.max(channelDisconnectTimeout - (Date.now() - startingValue), 0)
		);

		if (startingValue !== (await data.ref.once('value')).val()) {
			return;
		}

		const doomedRef = data.ref.parent.parent;

		if (doomedRef.key.length < 1) {
			throw new Error('INVALID DOOMED REF');
		}

		return removeItem(params.namespace, `channels/${doomedRef.key}`);
	});
*/

exports.checkInviteCode = onCall(async (data, namespace, getUsername) => {
	if (!data.inviteCode) {
		return {isValid: false};
	}

	const inviteCode = validateInput(data.inviteCode);
	const inviteDataRef = database.ref(
		`${namespace}/inviteCodes/${inviteCode}`
	);

	const inviteData = (await inviteDataRef.once('value')).val() || {};
	const {
		email,
		inviterUsername,
		keybaseUsername,
		pgpPublicKey,
		reservedUsername
	} = inviteData;
	const plan =
		inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

	const templateData = getInviteTemplateData({
		fromApp: true,
		inviteCode,
		plan
	});

	return {
		email,
		inviterUsername,
		isValid: typeof inviterUsername === 'string',
		keybaseUsername,
		pgpPublicKey,
		plan,
		reservedUsername,
		welcomeLetter: (await renderTemplate(
			'new-cyph-invite',
			templateData,
			true
		)).markdown
	};
});

exports.downgradeAccount = onRequest(true, async (req, res, namespace) => {
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

	const [appStoreReceipt, braintreeSubscriptionID] = await Promise.all([
		appStoreReceiptRef.once('value').then(o => o.val() || ''),
		braintreeSubscriptionIDRef.once('value').then(o => o.val() || '')
	]);

	await Promise.all([
		removeAppStoreReceiptRef ? appStoreReceiptRef.remove() : undefined,
		braintreeIDRef.remove(),
		braintreeSubscriptionIDRef.remove(),
		planTrialEndRef.remove(),
		setItem(namespace, `users/${username}/plan`, CyphPlan, {
			plan: CyphPlans.Free
		})
	]);

	return {appStoreReceipt, braintreeSubscriptionID};
});

exports.generateInvite = onRequest(true, async (req, res, namespace) => {
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

	/* Previously gifted free users one-month premium trials */
	let planTrialEnd = undefined;
	if (false && plan === CyphPlans.Free) {
		plan = CyphPlans.MonthlyPremium;
		planTrialEnd = new Date().setMonth(new Date().getMonth() + 1);
	}

	const {firstName, lastName} = splitName(name);

	const inviteCodes = await Promise.all(
		new Array(
			Math.min(braintreeIDs.length, braintreeSubscriptionIDs.length)
		)
			.fill(0)
			.map((_, i) => [braintreeIDs[i], braintreeSubscriptionIDs[i]])
			.map(async ([braintreeID, braintreeSubscriptionID], i) => {
				const inviteCode = readableID(15);

				await Promise.all([
					database.ref(`${namespace}/inviteCodes/${inviteCode}`).set({
						inviterUsername: '',
						plan,
						...(braintreeID ? {braintreeID} : {}),
						...(braintreeSubscriptionID ?
							{braintreeSubscriptionID} :
							{}),
						...(i === 0 && email ? {email} : {}),
						...(!isNaN(planTrialEnd) ? {planTrialEnd} : {})
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
								PLAN: CyphPlans[plan],
								TRIAL: !!planTrialEnd
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
	);

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
						(plan === CyphPlans.Free ?
							'' :
							planTrialEnd ?
							` (with ${titleize(CyphPlans[plan])} trial)` :
							` (${titleize(CyphPlans[plan])})`),
					{
						data: getInviteTemplateData({
							...(inviteCodes.length > 1 ?
								{inviteCodes} :
								{inviteCode: inviteCodes[0]}),
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

exports.getBraintreeSubscriptionID = onRequest(
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

exports.getCastleSessionID = onCall(async (data, namespace, getUsername) => {
	const [userA, userB] = normalizeArray([
		data.username || '',
		await getUsername()
	]);

	if (!userA || !userB) {
		return '';
	}

	return databaseService.getOrSetDefaultSimple(
		namespace,
		`castleSessions/${userA}/${userB}/id`,
		() => uuid(true)
	);
});

exports.getReactions = onCall(async (data, namespace, getUsername) => {
	const currentUser = await getUsername();
	const username = normalize(data.username);
	const id = validateInput(data.id);
	const isComment = data.isComment === true;

	if (!username || !id) {
		return {};
	}

	const parent = isComment ? 'postCommentReactions' : 'postReactions';

	const reactionsRef = database.ref(
		`${namespace}/users/${username}/${parent}/${id}`
	);

	const reactions = (await reactionsRef.once('value')).val() || {};

	return Object.entries(reactions)
		.map(([k, v]) => [
			k,
			{
				count: Object.keys(v).length,
				selected: currentUser in v
			}
		])
		.reduce((o, [k, v]) => ({...o, [k]: v}), {});
});

exports.getUserToken = onCall(async (data, namespace, getUsername) => {
	const [tokenKey, username] = await Promise.all([
		getTokenKey(namespace),
		getUsername()
	]);

	if (!username) {
		throw new Error('User not authenticated.');
	}

	return tokens.create({username}, tokenKey);
});

exports.itemHashChange = functions.database
	.ref('hash')
	.onUpdate(async ({after: data}, {params}) => {
		if (!data.exists()) {
			return;
		}

		const hash = data.val();

		if (typeof hash !== 'string') {
			return;
		}

		const url = getURL(data.adminRef.parent);

		const files = await Promise.all(
			(await storage.getFiles({prefix: `${url}/`}))[0].map(async file => {
				const [metadata] = await file.getMetadata();

				return {
					file,
					name: metadata.name.split('/').slice(-1)[0],
					timestamp: new Date(metadata.updated).getTime()
				};
			})
		);

		for (const o of files.sort((a, b) => a.timestamp > b.timestamp)) {
			if (o.name === hash) {
				return;
			}

			await retryUntilSuccessful(async () => {
				const [exists] = await o.file.exists();
				if (!exists) {
					return;
				}

				await o.file.delete();
			});
		}
	});

exports.itemRemoved = functions.database
	.ref('hash')
	.onDelete(async (data, {params}) => {
		if (data.exists()) {
			return;
		}

		return removeItem(
			params.namespace,
			getURL(data.adminRef, params.namespace)
		);
	});

exports.openUserToken = onRequest(true, async (req, res, namespace) => {
	const userToken = validateInput(req.body.userToken);

	return tokens.open(userToken, await getTokenKey(namespace));
});

exports.register = onCall(async (data, namespace, getUsername, testEnvName) => {
	const {
		altMasterKey,
		certificateRequest,
		email,
		encryptionKeyPair,
		inviteCode,
		loginData,
		loginDataAlt,
		password,
		pinHash,
		pinIsCustom,
		pseudoAccount,
		publicEncryptionKey,
		publicProfile,
		publicProfileExtra,
		signingKeyPair,
		username
	} = data || {};

	if (
		typeof inviteCode !== 'string' ||
		inviteCode.length < 1 ||
		typeof password !== 'string' ||
		password.length < 1 ||
		typeof username !== 'string' ||
		username.length < 1
	) {
		throw new Error('Invalid credentials for new account.');
	}

	const inviteDataRef = database.ref(
		`${namespace}/inviteCodes/${inviteCode}`
	);

	const inviteData = (await inviteDataRef.once('value')).val() || {};
	const {
		appStoreReceipt,
		braintreeID,
		braintreeSubscriptionID,
		inviterUsername,
		keybaseUsername,
		planTrialEnd,
		reservedUsername
	} = inviteData;
	const plan =
		inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

	if (typeof inviterUsername !== 'string') {
		throw new Error('Invalid invite code.');
	}

	if (
		(username.length < config.planConfig[plan].usernameMinLength &&
			!(reservedUsername && username === normalize(reservedUsername))) ||
		(await usernameBlacklisted(namespace, username, reservedUsername))
	) {
		throw new Error('Blacklisted username.');
	}

	const userRecord = await auth.createUser({
		disabled: false,
		email: `${username}@${namespace.replace(/_/g, '.')}`,
		emailVerified: true,
		password
	});

	const initialEmailAddressRef = !email ?
		undefined :
		database.ref(
			`${namespace}/initialEmailAddresses/${Buffer.from(email).toString(
				'hex'
			)}`
		);

	const pendingInviteRef = database.ref(
		`${namespace}/pendingInvites/${inviteCode}`
	);

	const setRegisterItems = async items =>
		Promise.all(
			items.map(async ([k, v, proto = BinaryProto]) =>
				setItem(namespace, `users/${username}/${k}`, proto, v)
			)
		);

	const permanentReservedUsername = reservedUsername ?
		(await database
			.ref(`${namespace}/reservedUsernames/${username}`)
			.once('value')).val() === '.' :
		false;

	await Promise.all([
		setRegisterItems([
			['altMasterKey', altMasterKey],
			['encryptionKeyPair', encryptionKeyPair],
			['inviteCode', inviteCode, StringProto],
			['pin/hash', pinHash],
			['pin/isCustom', pinIsCustom],
			['profileVisible', true, BooleanProto],
			['publicEncryptionKey', publicEncryptionKey],
			['publicProfile', publicProfile],
			['publicProfileExtra', publicProfileExtra],
			['signingKeyPair', signingKeyPair],
			pseudoAccount ?
				['pseudoAccount', new Uint8Array(0)] :
				['certificateRequest', certificateRequest]
		]),
		inviteDataRef.remove(),
		setItem(
			namespace,
			`users/${username}/inviterUsernamePlaintext`,
			StringProto,
			inviterUsername
		),
		setItem(namespace, `users/${username}/plan`, CyphPlan, {
			plan
		}),
		database.ref(`${namespace}/consumedInviteCodes/${inviteCode}`).set({
			...(email ? {email} : {}),
			username
		}),
		!initialEmailAddressRef ||
		(await initialEmailAddressRef.once('value')).exists() ?
			undefined :
			initialEmailAddressRef.set({
				inviteCode,
				username
			}),
		!appStoreReceipt ?
			undefined :
			database
				.ref(`${namespace}/users/${username}/internal/appStoreReceipt`)
				.set(appStoreReceipt),
		!braintreeID ?
			undefined :
			database
				.ref(`${namespace}/users/${username}/internal/braintreeID`)
				.set(braintreeID),
		!braintreeSubscriptionID ?
			undefined :
			database
				.ref(
					`${namespace}/users/${username}/internal/braintreeSubscriptionID`
				)
				.set(braintreeSubscriptionID),
		!inviterUsername ?
			undefined :
			removeItem(
				namespace,
				`users/${inviterUsername}/inviteCodes/${inviteCode}`
			).catch(() => {}),
		!keybaseUsername ?
			undefined :
			database
				.ref(`${namespace}/users/${username}/internal/keybaseUsername`)
				.set(keybaseUsername),
		isNaN(planTrialEnd) ?
			undefined :
			database
				.ref(`${namespace}/users/${username}/internal/planTrialEnd`)
				.set(planTrialEnd),
		reservedUsername &&
		(!permanentReservedUsername || reservedUsername === username) ?
			database
				.ref(
					`${namespace}/reservedUsernames/${normalize(
						reservedUsername
					)}`
				)
				.remove() :
			undefined,
		pendingInviteRef
			.once('value')
			.then(
				async o =>
					mailchimp &&
					mailchimpCredentials &&
					mailchimpCredentials.listIDs &&
					mailchimpCredentials.listIDs.pendingInvites &&
					removeFromMailingList(
						mailchimpCredentials.listIDs.pendingInvites,
						o.val()
					)
			)
			.catch(() => {})
			.then(async () => pendingInviteRef.remove())
	]);

	await setRegisterItems([
		['loginData', loginData],
		['loginDataAlt', loginDataAlt]
	]);

	if (email) {
		await setItem(namespace, `users/${username}/email`, StringProto, email);
	}

	await Promise.all([
		database.ref(`${namespace}/pendingSignups/${username}`).set({
			timestamp: admin.database.ServerValue.TIMESTAMP,
			uid: userRecord.uid
		}),
		sendMailInternal(
			'user-registrations@cyph.com',
			`${
				testEnvName ?
					`${testEnvName.replace(/^(.)/, s => s.toUpperCase())}: ` :
					''
			}Cyph User Registration`,
			userRecord.email
		)
	]);
});

exports.rejectPseudoRelationship = onCall(
	async (data, namespace, getUsername) => {
		const id = validateInput(data.id);
		const relationshipRef = database.ref(
			`${namespace}/pseudoRelationships/${id}`
		);

		const {aliceUsername} = await relationshipRef
			.once('value')
			.then(o => o.val());

		if (!aliceUsername) {
			throw new Error('Relationship request not found.');
		}

		await Promise.all([
			relationshipRef.remove(),
			removeItem(namespace, `users/${aliceUsername}/contacts/${id}`)
		]);
	}
);

exports.requestPseudoRelationship = onCall(
	async (data, namespace, getUsername) => {
		const {accountsURL} = namespaces[namespace];
		const email = validateEmail(data.email);
		const name = validateInput(data.name) || 'User';
		const id = uuid();
		const username = await getUsername();
		const relationshipRef = database.ref(
			`${namespace}/pseudoRelationships/${id}`
		);

		const [aliceName, aliceRealUsername] = await Promise.all([
			getName(namespace, username),
			getRealUsername(namespace, username)
		]);

		await Promise.all([
			relationshipRef.set({
				aliceUsername: username,
				bobEmail: email,
				bobName: name
			}),
			setItem(
				namespace,
				`users/${username}/contacts/${id}`,
				AccountContactState,
				{
					email,
					name,
					state: AccountContactState.States.OutgoingRequest
				}
			),
			sendMailInternal(
				email,
				`${titleize(
					contactString
				)} Request from ${aliceName} (@${aliceRealUsername})`,
				{
					data: {aliceName, id, name},
					namespace,
					templateName: 'external-contact-invite'
				}
			)
		]);
	}
);

exports.resetCastleSessionID = onCall(async (data, namespace, getUsername) => {
	const [userA, userB] = normalizeArray([
		data.username || '',
		await getUsername()
	]);

	if (!userA || !userB) {
		return;
	}

	await database
		.ref(`${namespace}/castleSessions/${userA}/${userB}/id`)
		.set(uuid(true));
});

exports.sendAppLink = onCall(async (data, namespace, getUsername) => {
	const phoneNumber = (data.phoneNumber || '').trim();

	if (typeof phoneNumber !== 'string' || !phoneNumber) {
		return;
	}

	await sendSMS(
		phoneNumber,
		`Here's the link you requested to install Cyph! https://www.cyph.com/download-app`
	);
});

exports.sendInvite = onCall(async (data, namespace, getUsername) => {
	const {accountsURL} = namespaces[namespace];
	const email = validateEmail(data.email, true);
	const name = validateInput(data.name, undefined, true);
	const inviterUsername = await getUsername();
	const inviteCodesRef = database.ref(
		`${namespace}/users/${inviterUsername}/inviteCodes`
	);

	const [inviterName, inviterRealUsername, inviterPlan] = await Promise.all([
		getName(namespace, inviterUsername),
		getRealUsername(namespace, inviterUsername),
		getItem(namespace, `users/${inviterUsername}/plan`, CyphPlan)
			.catch(() => undefined)
			.then(o => (o && o.plan in CyphPlans ? o.plan : CyphPlans.Free))
	]);

	const inviterPlanConfig = config.planConfig[inviterPlan];

	const inviteCode =
		inviterPlanConfig.initialInvites !== undefined ?
			await inviteCodesRef
				.once('value')
				.then(snapshot => Object.keys(snapshot.val() || {})[0]) :
			await (async () => {
				const code = readableID(15);

				/* Previously gifted free users one-month premium trials */
				let plan = CyphPlans.Free;
				let planTrialEnd = undefined;
				if (false) {
					plan = CyphPlans.MonthlyPremium;
					planTrialEnd = new Date().setMonth(
						new Date().getMonth() + 1
					);
				}

				await Promise.all([
					database.ref(`${namespace}/inviteCodes/${code}`).set({
						inviterUsername,
						plan,
						...(email ? {email} : {}),
						...(!isNaN(planTrialEnd) ? {planTrialEnd} : {})
					}),
					setItem(
						namespace,
						`users/${inviterUsername}/inviteCodes/${code}`,
						BooleanProto,
						true
					)
				]);

				return code;
			})();

	if (!inviteCode) {
		throw new Error('No available invites.');
	}

	const inviteDataRef = database.ref(
		`${namespace}/inviteCodes/${inviteCode}`
	);

	const inviteData = (await inviteDataRef.once('value')).val() || {};
	const plan =
		inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

	const {firstName, lastName} = splitName(name || '');

	await Promise.all([
		inviterPlanConfig.initialInvites !== undefined &&
			inviteCodesRef.child(inviteCode).remove(),
		email ?
			database
				.ref(
					`${namespace}/inviteCodeEmailAddresses/${Buffer.from(
						email
					).toString('hex')}/${inviteCode}`
				)
				.set({inviterUsername}) :
			undefined,
		email &&
			sendMailInternal(
				email,
				`${inviterName} (@${inviterRealUsername}) Has Invited You to Cyph!` +
					(inviteData.planTrialEnd ?
						` (with ${titleize(CyphPlans[plan])} trial)` :
						''),
				{
					data: getInviteTemplateData({
						inviteCode,
						inviterName,
						name,
						plan
					}),
					namespace,
					noUnsubscribe: true,
					templateName: 'new-cyph-invite'
				}
			),
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
					PLAN: CyphPlans[plan],
					TRIAL: !!inviteData.planTrialEnd
				}
			)
				.then(async mailingListID =>
					database
						.ref(`${namespace}/pendingInvites/${inviteCode}`)
						.set(mailingListID)
				)
				.catch(() => {}) :
			undefined
	]);

	return inviteCode;
});

exports.setContact = onCall(async (data, namespace, getUsername) => {
	const add = data.add === true;
	const innerCircle = data.innerCircle === true;
	const contact = normalize(validateInput(data.username));
	const username = await getUsername();

	const contactURL = `users/${username}/contacts/${contact}`;
	const otherContactURL = `users/${contact}/contacts/${username}`;
	const innerCircleURL = `users/${username}/contactsInnerCircle/${contact}`;
	const otherInnerCircleURL = `users/${contact}/contactsInnerCircle/${username}`;

	const pseudoAccountRef = database.ref(
		`${namespace}/users/${username}/pseudoAccount`
	);

	const [otherContactState, otherContactStateNewData] = await Promise.all([
		getItem(
			namespace,
			innerCircle ? otherInnerCircleURL : otherContactURL,
			AccountContactState
		)
			.then(o => o.state)
			.catch(() => undefined),
		pseudoAccountRef.once('value').then(async o =>
			!o.val() ?
				{} :
				{
					email: ' ',
					name: (await getItem(
						namespace,
						`users/${username}/publicProfile`,
						AccountUserProfile,
						true,
						true
					).catch(() => ({}))).name
				}
		)
	]);

	const notifyContact = async type =>
		userNotify(
			{metadata: {innerCircle}, target: contact, type},
			namespace,
			username,
			true
		);

	const setContactState = async (currentUser, state) =>
		Promise.all(
			[
				currentUser ? contactURL : otherContactURL,
				...(innerCircle || state === undefined ?
					[currentUser ? innerCircleURL : otherInnerCircleURL] :
					[])
			].map(async url =>
				state === undefined ?
					removeItem(namespace, url) :
					setItem(namespace, url, AccountContactState, {
						...(currentUser ? {} : otherContactStateNewData),
						innerCircle,
						state
					})
			)
		);

	/* Remove */
	if (!add) {
		return Promise.all([setContactState(true), setContactState(false)]);
	}

	/* Mutual acceptance */
	if (
		otherContactState === AccountContactState.States.Confirmed ||
		otherContactState === AccountContactState.States.OutgoingRequest
	) {
		return Promise.all([
			setContactState(true, AccountContactState.States.Confirmed),
			setContactState(false, AccountContactState.States.Confirmed),
			notifyContact(NotificationTypes.ContactAccept)
		]);
	}

	/* Outgoing request */
	return Promise.all([
		setContactState(true, AccountContactState.States.OutgoingRequest),
		setContactState(false, AccountContactState.States.IncomingRequest),
		notifyContact(NotificationTypes.ContactRequest)
	]);
});

exports.userDisconnect = functions.database
	.ref('/{namespace}/users/{user}/clientConnections')
	.onDelete(async (data, {params}) => {
		const username = params.user;

		return removeItem(params.namespace, `users/${username}/presence`);
	});

exports.userEmailSet = functions.database
	.ref('/{namespace}/users/{user}/email')
	.onWrite(async ({after: data}, {params}) => {
		const username = params.user;
		const userURL = `${params.namespace}/users/${username}`;
		const internalURL = `${userURL}/internal`;
		const emailRef = database.ref(`${internalURL}/email`);
		const nameRef = database.ref(`${internalURL}/name`);
		const pseudoAccountRef = database.ref(`${userURL}/pseudoAccount`);
		const registrationEmailSentRef = database.ref(
			`${internalURL}/registrationEmailSent`
		);

		const [email, plan, planTrialEnd] = await Promise.all([
			getItem(params.namespace, `users/${username}/email`, StringProto)
				.then(s => s.trim().toLowerCase())
				.catch(() => undefined),
			getItem(params.namespace, `users/${username}/plan`, CyphPlan)
				.catch(() => undefined)
				.then(o =>
					o && o.plan in CyphPlans ? o.plan : CyphPlans.Free
				),
			database
				.ref(`${internalURL}/planTrialEnd`)
				.once('value')
				.then(o => o.val())
		]);

		if (email && emailRegex.test(email)) {
			await Promise.all([
				emailRef.set(email),
				(async () => {
					if (
						!mailchimp ||
						!mailchimpCredentials ||
						!mailchimpCredentials.listIDs ||
						!mailchimpCredentials.listIDs.users
					) {
						return;
					}

					const {firstName, lastName} = splitName(
						(await nameRef.once('value')).val()
					);

					await addToMailingList(
						mailchimpCredentials.listIDs.users,
						email,
						{
							FNAME: firstName,
							LNAME: lastName,
							PLAN: CyphPlans[plan],
							TRIAL: !!planTrialEnd,
							USERNAME: username
						}
					);
				})().catch(() => {})
			]);
		}
		else {
			await emailRef.remove();
		}

		const [pseudoAccount, registrationEmailSent] = (await Promise.all([
			pseudoAccountRef.once('value'),
			registrationEmailSentRef.once('value')
		])).map(o => o.val());
		if (pseudoAccount || registrationEmailSent) {
			return;
		}

		const [realUsername] = await Promise.all([
			getRealUsername(params.namespace, username),
			registrationEmailSentRef.set(true)
		]);

		await notify(
			params.namespace,
			username,
			`Your Registration is Being Processed, ${realUsername}`,
			{templateName: 'registration-pending'}
		);
	});

exports.usernameBlacklisted = onCall(async (data, namespace, getUsername) => {
	const username = normalize(validateInput(data.username));

	return {isBlacklisted: await usernameBlacklisted(namespace, username)};
});

/* TODO: Translations and user block lists. */
const userNotify = async (data, namespace, username, serverInitiated) => {
	const notification = data;
	const metadata =
		typeof notification.metadata === 'object' ? notification.metadata : {};
	const now = Date.now();

	const notificationID =
		metadata.id &&
		typeof metadata.id === 'string' &&
		metadata.id.indexOf(',') < 0 ?
			metadata.id :
			undefined;

	if (!notification || !notification.target || isNaN(notification.type)) {
		return;
	}

	notification.target = normalize(notification.target);

	const userPath = `${namespace}/users/${notification.target}`;

	const groupID =
		notification.type === NotificationTypes.Message && metadata.groupID ?
			normalize(metadata.groupID) :
			undefined;

	const unreadMessagesID =
		notification.type === NotificationTypes.Message ?
			groupID || username :
			'';

	const activeCall =
		notification.type === NotificationTypes.Call &&
		(metadata.callType === 'audio' ||
			metadata.callType === 'video' ||
			metadata.callType === 'chat') &&
		!metadata.missed &&
		(typeof metadata.expires === 'number' && metadata.expires > now);

	const callMetadata = activeCall ?
		`${metadata.callType},${username || ''},${groupID ||
			''},${notificationID},${metadata.expires.toString()}` :
		undefined;

	const [
		senderName,
		senderUsername,
		targetName,
		badge,
		count
	] = await Promise.all([
		getName(namespace, username),
		getRealUsername(namespace, username),
		getName(namespace, notification.target),
		Promise.all([
			database
				.ref(`${userPath}/incomingFiles`)
				.once('value')
				.then(o => [o.val()])
				.catch(() => []),
			database
				.ref(`${userPath}/unreadMessages`)
				.once('value')
				.then(o => Object.values(o.val()))
				.catch(() => [])
		]).then(values =>
			values
				.reduce((a, b) => a.concat(b), [])
				.map(o => Object.keys(o || {}).length)
				.reduce((a, b) => a + b, 0)
		),
		(async () => {
			if (!notificationID) {
				return;
			}

			const hasFile = async () =>
				(await database
					.ref(`${userPath}/fileReferences/${notificationID}`)
					.once('value')).exists();

			const [child, path] = activeCall ?
				[false, `incomingCalls/${callMetadata}`] :
			notification.type === NotificationTypes.File ?
				[
					true,
					!(await hasFile()) ?
						'unreadFiles/' +
						(!isNaN(metadata.fileType) &&
						metadata.fileType in AccountFileRecord.RecordTypes ?
							metadata.fileType :
							AccountFileRecord.RecordTypes.File
						).toString() :
						undefined
				] :
			notification.type === NotificationTypes.Message &&
				unreadMessagesID ?
				[true, `unreadMessages/${unreadMessagesID}`] :
				[];

			if (!path) {
				return;
			}

			const notificationRef = database.ref(
				`${userPath}/${path}${child ? `/${notificationID}` : ''}`
			);

			await notificationRef.set({
				data: '',
				hash: '',
				timestamp: admin.database.ServerValue.TIMESTAMP
			});

			if (!notificationRef.parent) {
				return;
			}

			return Object.keys(
				(await notificationRef.parent.once('value')).val() || {}
			).length;
		})()
			.catch(err => {
				console.error(err);
			})
			.then(n => (typeof n !== 'number' || isNaN(n) ? 1 : n))
	]);

	const callString =
		metadata.callType === 'chat' ?
			'Burner Chat' :
		metadata.callType === 'video' ?
			'Video Call' :
			'Call';
	const contactString = metadata.innerCircle ? 'Inner Circle' : 'contact';

	const {
		actions,
		additionalData = {},
		eventDetails,
		subject,
		tag = notificationID,
		text
	} =
		notification.type === NotificationTypes.CalendarEvent ?
			{
				eventDetails: {
					description: metadata.description,
					endTime: isNaN(metadata.endTime) ?
						now + 3600000 :
						metadata.endTime,
					inviterUsername: senderUsername,
					location: metadata.location,
					startTime: isNaN(metadata.startTime) ?
						now + 1800000 :
						metadata.startTime,
					summary: metadata.summary || 'Cyph Appointment'
				},
				subject: `Calendar Invite from ${senderUsername}`,
				text: `${targetName}, ${senderName} has sent an appointment request.`
			} :
		activeCall ?
			{
				actions: [
					{
						icon: 'call_end',
						title: 'Decline',
						callback: 'callReject',
						foreground: false
					},
					{
						icon: 'call',
						title: 'Answer',
						callback: 'callAccept',
						foreground: true
					}
				],
				subject: `Incoming ${callString} from ${senderUsername}`,
				text: `${targetName}, ${senderUsername} is calling you.`
			} :
		notification.type === NotificationTypes.Call ?
			{
				actions: [
					{
						icon: 'call',
						title: 'Call Back',
						callback: 'callBack',
						foreground: true
					}
				],
				subject: `Missed ${callString} from ${senderUsername}`,
				text: `${targetName}, ${senderUsername} tried to call you.`
			} :
		notification.type === NotificationTypes.ContactAccept &&
		serverInitiated ?
			{
				subject: `${titleize(
					contactString
				)} Confirmation from ${senderUsername}`,
				text: `${targetName}, ${senderName} has accepted your ${contactString} request.`
			} :
		notification.type === NotificationTypes.ContactRequest &&
		serverInitiated ?
			{
				subject: `${titleize(
					contactString
				)} Request from ${senderUsername}`,
				text:
					`${targetName}, ${senderName} wants to join your ${contactString} list. ` +
					`Log in to accept or decline.`
			} :
		notification.type === NotificationTypes.Message ?
			{
				additionalData: {groupID},
				subject: `${
					count > 1 ?
						`${count} new ${groupID ? 'group ' : ''}messages` :
						`New ${groupID ? 'Group ' : ''}Message`
				} from ${senderUsername}`,
				tag: unreadMessagesID,
				text: `${targetName}, ${senderName} has sent you a ${
					groupID ? 'group ' : ''
				}message.`
			} :
		notification.type === NotificationTypes.Yo ?
			{
				subject: `Sup Dog, it's ${senderUsername}`,
				text: `${targetName}, ${senderName} says yo.`
			} :
		notification.type !== NotificationTypes.File ?
			{} :
		metadata.fileType === AccountFileRecord.RecordTypes.Appointment ?
			{
				subject: `Appointment Request from ${senderUsername}`,
				text: `${targetName}, ${senderName} has requested an appointment with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.Doc ?
			{
				subject: `Incoming Document from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a document with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.EhrApiKey ?
			{
				subject: `Incoming EHR Access from ${senderUsername}`,
				text: `${targetName}, ${senderName} has granted you access to an EHR system.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.File ?
			{
				subject: `Incoming File from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a file with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.Form ?
			{
				subject: `Incoming Form from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a form with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.MessagingGroup ?
			{
				subject: `Group Invite from ${senderUsername}`,
				text: `${targetName}, ${senderName} has invited you to join a group chat.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.Note ?
			{
				subject: `Incoming Note from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a note with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.Password ?
			{
				subject: `Incoming Password from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a password with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.RedoxPatient ?
			{
				subject: `Incoming Patient Data from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a patient with you.`
			} :
		metadata.fileType === AccountFileRecord.RecordTypes.Wallet ?
			{
				subject: `Incoming Wallet from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared a cryptocurrency wallet with you.`
			} :
			{
				subject: `Incoming Data from ${senderUsername}`,
				text: `${targetName}, ${senderName} has shared something with you.`
			};

	if (!subject || !text) {
		throw new Error(`Invalid notification type: ${notification.type}`);
	}

	await Promise.all([
		notify(
			namespace,
			notification.target,
			subject,
			text,
			eventDetails,
			{
				actions,
				additionalData: {
					...additionalData,
					activeCall,
					callMetadata,
					notificationID,
					notificationType: notification.type,
					senderUsername,
					tag
				},
				badge,
				ring: activeCall,
				tag: `${notification.type}_${tag}`
			},
			true
		),
		pushItem(
			namespace,
			`users/${notification.target}/notifications`,
			AccountNotification,
			{
				actions,
				callMetadata,
				eventID: notificationID,
				fileType: metadata.fileType,
				isRead: false,
				messagesID: groupID,
				text: subject,
				textDetail: text,
				timestamp: now,
				type: notification.type,
				username
			}
		)
	]);
};

exports.userNotify = onCall(async (data, namespace, getUsername) => {
	if (!data || !data.target) {
		return;
	}

	const username = await getUsername();

	if (typeof data.target === 'string') {
		await userNotify(data, namespace, username);
	}
	else if (data.target instanceof Array) {
		await Promise.all(
			data.target.map(async target =>
				userNotify({...data, target}, namespace, username)
			)
		);
	}
});

exports.userPublicProfileSet = functions.database
	.ref('/{namespace}/users/{user}/publicProfile')
	.onWrite(async ({after: data}, {params}) => {
		const username = params.user;
		const internalURL = `${params.namespace}/users/${username}/internal`;
		const nameRef = database.ref(`${internalURL}/name`);
		const realUsernameRef = database.ref(`${internalURL}/realUsername`);

		const publicProfile = await getItem(
			params.namespace,
			`users/${username}/publicProfile`,
			AccountUserProfile,
			true,
			true
		).catch(() => undefined);

		return Promise.all([
			nameRef
				.once('value')
				.then(o => o.val())
				.then(async oldName =>
					publicProfile && publicProfile.name ?
						nameRef.set(publicProfile.name) :
					!oldName ?
						nameRef.set(username) :
						undefined
				),
			realUsernameRef.set(
				publicProfile &&
					normalize(publicProfile.realUsername) === username ?
					publicProfile.realUsername :
					username
			)
		]);
	});

exports.userRegisterConfirmed = functions.database
	.ref('/{namespace}/users/{user}/certificate')
	.onCreate(async (data, {params}) => {
		const username = params.user;

		const [
			name,
			realUsername,
			registrationEmailSentRef
		] = await Promise.all([
			getName(params.namespace, username),
			getRealUsername(params.namespace, username),
			database.ref(
				`${params.namespace}/users/${username}/internal/registrationEmailSent`
			)
		]);

		await Promise.all([
			notify(
				params.namespace,
				username,
				`Welcome to Cyph, ${realUsername}`,
				{
					data: {
						name,
						primaryNamespace: params.namespace === 'cyph_ws'
					},
					templateName: 'registration-confirmed'
				}
			),
			registrationEmailSentRef.set(true)
		]);
	});
