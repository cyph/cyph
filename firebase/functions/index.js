const cors = require('cors')({origin: true});
const firebase = require('firebase');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const usernameBlacklist = new Set(require('username-blacklist'));
const {config} = require('./config');
const {sendMail, sendMailInternal} = require('./email');
const {emailRegex} = require('./email-regex');
const namespaces = require('./namespaces');

const {
	auth,
	database,
	getHash,
	getItem,
	hasItem,
	messaging,
	removeItem,
	setItem,
	setItemInternal,
	storage
} = require('./database-service')(functions.config(), true);

const {
	AccountContactState,
	AccountFileRecord,
	AccountUserProfile,
	CyphPlan,
	CyphPlans,
	NotificationTypes,
	NumberProto,
	StringProto
} = require('./proto');

const {
	normalize,
	readableByteLength,
	readableID,
	sleep,
	uuid
} = require('./util');

const {notify} = require('./notify')(database, messaging);

const channelDisconnectTimeout = 20000;

const getFullBurnerURL = (namespace, callType) => {
	const {burnerURL} = namespaces[namespace];

	return namespace === 'cyph_healthcare' ?
		callType === 'audio' ?
			'https://audio.cyph.healthcare/' :
		callType === 'video' ?
			'https://video.cyph.healthcare/' :
		'https://chat.cyph.healthcare/' :
	namespace === 'cyph_ws' ?
		callType === 'audio' ?
			'https://cyph.audio/' :
		callType === 'video' ?
			'https://cyph.video/' :
		'https://cyph.im/' :
	callType === 'audio' ?
		`${burnerURL}audio/` :
	callType === 'video' ?
		`${burnerURL}video/` :
		burnerURL;
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
const validateInput = (input, regex) => {
	if (!input || input.indexOf('/') > -1 || (regex && !regex.test(input))) {
		throw new Error('Invalid data.');
	}

	return input;
};

const onCall = f =>
	functions.https.onCall(async (data, context) =>
		f(
			data,
			context,
			validateInput(data.namespace.replace(/\./g, '_')),
			async () =>
				context.auth ?
					(await auth.getUser(context.auth.uid)).email.split('@')[0] :
					undefined
		)
	);

const onRequest = f =>
	functions.https.onRequest((req, res) =>
		cors(req, res, async () => {
			try {
				await f(
					req,
					res,
					validateInput(req.body.namespace.replace(/\./g, '_'))
				);
			}
			catch (err) {
				console.error(err);
				res.status(500);
				res.send({error: true});
			}
		})
	);

exports.acceptPseudoRelationship = onCall(
	async (data, context, namespace, getUsername) => {
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
				{email, name, state: AccountContactState.States.Confirmed},
				true
			),
			setItem(
				namespace,
				`users/${bob}/contacts/${alice}`,
				AccountContactState,
				{state: AccountContactState.States.Confirmed},
				true
			),
			hasItem(namespace, `users/${bob}/email`).then(async hasEmail =>
				hasEmail ?
					undefined :
					setItem(
						namespace,
						`users/${bob}/email`,
						StringProto,
						email,
						true
					)
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
				notify(namespace, alice, `Contact Confirmation from ${email}`, {
					data: {aliceName, name},
					templateName: 'external-contact-accept'
				})
			)
		]);

		return alice;
	}
);

exports.appointmentInvite = onCall(
	async (data, context, namespace, getUsername) => {
		const id = readableID(config.cyphIDLength);
		const inviterUsername = await getUsername();
		const {accountsURL} = namespaces[namespace];

		await Promise.all([
			sendMail(
				database,
				namespace,
				data.to,
				`Cyph Appointment with @${inviterUsername}`,
				undefined,
				{
					endTime: data.eventDetails.endTime,
					inviterUsername: data.to,
					location: `${getFullBurnerURL(
						namespace,
						data.callType
					)}${inviterUsername}/${id}`,
					startTime: data.eventDetails.startTime
				}
			),
			sendMail(
				database,
				namespace,
				inviterUsername,
				`Cyph Appointment with ${data.to.name} <${data.to.email}>`,
				undefined,
				{
					endTime: data.eventDetails.endTime,
					inviterUsername: data.to,
					location: `${accountsURL}account-burner/${data.callType ||
						'chat'}/${id}`,
					startTime: data.eventDetails.startTime
				}
			)
		]);
	}
);

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

exports.checkInviteCode = onCall(
	async (data, context, namespace, getUsername) => {
		const inviteCode = validateInput(data.inviteCode);
		const inviteDataRef = database.ref(
			`${namespace}/inviteCodes/${inviteCode}`
		);

		const {inviterUsername, plan, reservedUsername} =
			(await inviteDataRef.once('value')).val() || {};
		return {
			inviterUsername,
			isValid: typeof inviterUsername === 'string',
			plan: plan in CyphPlans ? plan : CyphPlans.Free,
			reservedUsername
		};
	}
);

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

exports.rejectPseudoRelationship = onCall(
	async (data, context, namespace, getUsername) => {
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
	async (data, context, namespace, getUsername) => {
		const {accountsURL} = namespaces[namespace];
		const email = validateInput(data.email, emailRegex);
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
				},
				true
			),
			sendMailInternal(
				email,
				`Contact Request from ${aliceName} (@${aliceRealUsername})`,
				{
					data: {aliceName, id, name},
					namespace,
					templateName: 'external-contact-invite'
				}
			)
		]);
	}
);

exports.sendInvite = onCall(async (data, context, namespace, getUsername) => {
	const {accountsURL} = namespaces[namespace];
	const email = validateInput(data.email, emailRegex);
	const name = validateInput(data.name);
	const inviterUsername = await getUsername();
	const inviteCodesRef = database.ref(
		`${namespace}/users/${inviterUsername}/inviteCodes`
	);

	const [inviterName, inviterRealUsername, inviteCode] = await Promise.all([
		getName(namespace, inviterUsername),
		getRealUsername(namespace, inviterUsername),
		inviteCodesRef
			.once('value')
			.then(snapshot => Object.keys(snapshot.val() || {})[0])
	]);

	if (!inviteCode) {
		throw new Error('No available invites.');
	}

	const inviteDataRef = database.ref(
		`${namespace}/inviteCodes/${inviteCode}`
	);

	const plan =
		((await inviteDataRef.once('value')).val() || {}).plan ||
		CyphPlans.Free;
	const planConfig = config.planConfig[plan];

	await Promise.all([
		inviteCodesRef.child(inviteCode).remove(),
		sendMailInternal(
			email,
			`Cyph Invite from ${inviterName} (@${inviterRealUsername})`,
			{
				data: {
					...planConfig,
					inviteCode,
					inviterName,
					name,
					planFoundersAndFriends:
						plan === CyphPlans.FoundersAndFriends,
					planFree: plan === CyphPlans.Free,
					planGold: plan === CyphPlans.Gold,
					planLifetimePlatinum: plan === CyphPlans.LifetimePlatinum,
					planSilver: plan === CyphPlans.Silver,
					platinumFeatures: planConfig.usernameMinLength === 1,
					storageCap: readableByteLength(
						planConfig.storageCapGB,
						'gb'
					)
				},
				namespace,
				templateName: 'new-cyph-invite'
			}
		)
	]);
});

exports.userConsumeInvite = functions.database
	.ref('/{namespace}/users/{user}/inviteCode')
	.onWrite(async (data, {params}) => {
		if (!data.after.val()) {
			return;
		}

		const username = params.user;

		const inviteCode = await getItem(
			params.namespace,
			`users/${username}/inviteCode`,
			StringProto
		);

		if (!inviteCode) {
			return;
		}

		const inviteDataRef = database.ref(
			`${params.namespace}/inviteCodes/${inviteCode}`
		);

		const {inviterUsername, plan, reservedUsername} =
			(await inviteDataRef.once('value')).val() || {};
		if (
			await usernameBlacklisted(
				params.namespace,
				username,
				reservedUsername
			)
		) {
			return;
		}

		return Promise.all([
			inviteDataRef.remove(),
			setItem(
				params.namespace,
				`users/${username}/inviterUsernamePlaintext`,
				StringProto,
				typeof inviterUsername === 'string' ? inviterUsername : ' ',
				true
			),
			setItem(
				params.namespace,
				`users/${username}/plan`,
				CyphPlan,
				{plan: plan in CyphPlans ? plan : CyphPlans.Free},
				true
			),
			!inviterUsername ?
				undefined :
				removeItem(
					params.namespace,
					`users/${inviterUsername}/inviteCodes/${inviteCode}`
				).catch(() => {}),
			!reservedUsername ?
				undefined :
				database
					.ref(
						`${params.namespace}/reservedUsernames/${normalize(
							reservedUsername
						)}`
					)
					.remove()
		]);
	});

exports.userContactSet = functions.database
	.ref('/{namespace}/users/{user}/contacts/{contact}')
	.onWrite(async ({after: data}, {params}) => {
		const contact = params.contact;
		const username = params.user;
		const contactURL = `users/${username}/contacts/${contact}`;
		const otherContactURL = `users/${contact}/contacts/${username}`;

		const contactState = (await getItem(
			params.namespace,
			contactURL,
			AccountContactState
		).catch(() => ({state: undefined}))).state;

		/* If removing contact, delete on other end */
		if (contactState === undefined) {
			return removeItem(params.namespace, otherContactURL);
		}

		const pseudoAccountRef = database.ref(
			`${params.namespace}/users/${username}/pseudoAccount`
		);

		const [otherContactState, otherContactStateNewData] = await Promise.all(
			[
				getItem(params.namespace, otherContactURL, AccountContactState)
					.then(o => o.state)
					.catch(() => undefined),
				pseudoAccountRef.once('value').then(async o =>
					!o.val() ?
						{} :
						{
							email: ' ',
							name: (await getItem(
								params.namespace,
								`users/${username}/publicProfile`,
								AccountUserProfile,
								true,
								true
							).catch(() => ({}))).name
						}
				)
			]
		);

		/* Handle all possible valid contact state pairings */
		switch (contactState) {
			case AccountContactState.States.Confirmed:
				switch (otherContactState) {
					case AccountContactState.States.Confirmed:
						return;

					case AccountContactState.States.IncomingRequest:
						return setItem(
							params.namespace,
							contactURL,
							AccountContactState,
							{state: AccountContactState.States.OutgoingRequest},
							true
						);

					case AccountContactState.States.OutgoingRequest:
						return setItem(
							params.namespace,
							otherContactURL,
							AccountContactState,
							{
								...otherContactStateNewData,
								state: AccountContactState.States.Confirmed
							},
							true
						);

					default:
						Promise.all([
							setItem(
								params.namespace,
								contactURL,
								AccountContactState,
								{
									state:
										AccountContactState.States
											.OutgoingRequest
								},
								true
							),
							setItem(
								params.namespace,
								otherContactURL,
								AccountContactState,
								{
									...otherContactStateNewData,
									state:
										AccountContactState.States
											.IncomingRequest
								},
								true
							)
						]);
				}

			case AccountContactState.States.IncomingRequest:
				switch (otherContactState) {
					case AccountContactState.States.Confirmed:
						return setItem(
							params.namespace,
							otherContactURL,
							AccountContactState,
							{
								...otherContactStateNewData,
								state:
									AccountContactState.States.OutgoingRequest
							},
							true
						);

					case AccountContactState.States.OutgoingRequest:
						return;
				}

			case AccountContactState.States.OutgoingRequest:
				switch (otherContactState) {
					case AccountContactState.States.Confirmed:
						return setItem(
							params.namespace,
							contactURL,
							AccountContactState,
							{state: AccountContactState.States.Confirmed},
							true
						);

					case AccountContactState.States.IncomingRequest:
						return;

					case AccountContactState.States.OutgoingRequest:
						return Promise.all([
							setItem(
								params.namespace,
								contactURL,
								AccountContactState,
								{state: AccountContactState.States.Confirmed},
								true
							),
							setItem(
								params.namespace,
								otherContactURL,
								AccountContactState,
								{
									...otherContactStateNewData,
									state: AccountContactState.States.Confirmed
								},
								true
							)
						]);

					default:
						return setItem(
							params.namespace,
							otherContactURL,
							AccountContactState,
							{
								...otherContactStateNewData,
								state:
									AccountContactState.States.IncomingRequest
							},
							true
						);
				}
		}

		/* Clear out invalid states */
		return Promise.all([
			removeItem(params.namespace, contactURL),
			removeItem(params.namespace, otherContactURL)
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
		const pseudoAccountRef = database.ref(`${userURL}/pseudoAccount`);
		const registrationEmailSentRef = database.ref(
			`${internalURL}/registrationEmailSent`
		);

		const email = await getItem(
			params.namespace,
			`users/${username}/email`,
			StringProto
		).catch(() => undefined);

		if (email && emailRegex.test(email)) {
			await emailRef.set(email);
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

exports.usernameBlacklisted = onCall(
	async (data, context, namespace, getUsername) => {
		const username = normalize(validateInput(data.username));

		return {isBlacklisted: await usernameBlacklisted(namespace, username)};
	}
);

/* TODO: Translations and user block lists. */
exports.userNotify = onCall(async (data, context, namespace, getUsername) => {
	const username = await getUsername();
	const notification = data;
	const metadata =
		typeof notification.metadata === 'object' ? notification.metadata : {};
	const now = Date.now();

	if (!notification || !notification.target || isNaN(notification.type)) {
		return;
	}

	await Promise.all([
		(async () => {
			const [senderName, senderUsername, targetName] = await Promise.all([
				getName(namespace, username),
				getRealUsername(namespace, username),
				getName(namespace, notification.target)
			]);

			const {eventDetails, subject, text} =
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
				notification.type === NotificationTypes.Call ?
					{
							subject: `Incoming Call from ${senderUsername}`,
							text: `${targetName}, ${senderUsername} is calling you.`
					  } :
				notification.type === NotificationTypes.ContactAccept ?
					{
							subject: `Contact Confirmation from ${senderUsername}`,
							text: `${targetName}, ${senderName} has accepted your contact request.`
					  } :
				notification.type === NotificationTypes.ContactRequest ?
					{
							subject: `Contact Request from ${senderUsername}`,
							text:
								`${targetName}, ${senderName} wants to be your contact. ` +
								`Log in to accept or decline.`
					  } :
				notification.type === NotificationTypes.File ?
					{
							subject: `Incoming Data from ${senderUsername}`,
							text: `${targetName}, ${senderName} has shared something with you.`
					  } :
				notification.type === NotificationTypes.Message ?
					{
							subject: `New Message from ${senderUsername}`,
							text: `${targetName}, ${senderName} has sent you a message.`
					  } :
				notification.type === NotificationTypes.Yo ?
					{
							subject: `Sup Dog, it's ${senderUsername}`,
							text: `${targetName}, ${senderName} says yo.`
					  } :
					{};
			if (!subject || !text) {
				throw new Error(
					`Invalid notification type: ${notification.type}`
				);
			}

			await notify(
				namespace,
				notification.target,
				subject,
				text,
				eventDetails,
				true
			);
		})(),
		(async () => {
			if (
				!metadata.id ||
				typeof metadata.id !== 'string' ||
				metadata.id.indexOf(',') > -1
			) {
				return;
			}

			const userPath = `${namespace}/users/${notification.target}`;

			const hasFile = async () =>
				(await database
					.ref(`${userPath}/fileReferences/${metadata.id}`)
					.once('value')).exists();
			const [child, path] =
				notification.type === NotificationTypes.Call &&
				(metadata.callType === 'audio' ||
					metadata.callType === 'video') &&
				(typeof metadata.expires === 'number' &&
					metadata.expires > Date.now()) ?
					[
							false,
							`incomingCalls/${metadata.callType},${username},${
								metadata.id
							},${metadata.expires.toString()}`
					  ] :
				notification.type === NotificationTypes.File ?
					[
							true,
							!(await hasFile()) ?
								'unreadFiles/' +
								  (!isNaN(metadata.fileType) &&
								  metadata.fileType in
										AccountFileRecord.RecordTypes ?
										metadata.fileType :
										AccountFileRecord.RecordTypes.File
								  ).toString() :
								undefined
					  ] :
				notification.type === NotificationTypes.Message &&
					  metadata.castleSessionID ?
					[true, `unreadMessages/${metadata.castleSessionID}`] :
					[];
			if (!path) {
				return;
			}

			await database
				.ref(`${userPath}/${path}${child ? `/${metadata.id}` : ''}`)
				.set({
					data: '',
					hash: '',
					timestamp: admin.database.ServerValue.TIMESTAMP
				});
		})()
	]);
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

exports.userRegister = functions.auth
	.user()
	.onCreate(async (userRecord, {params}) => {
		const emailSplit = (userRecord.email || '').split('@');
		const username = normalize(emailSplit[0]);
		const namespace = emailSplit[1].replace(/\./g, '_');

		const inviteCode = validateInput(
			await getItem(
				namespace,
				`pendingSignupInviteCodes/${username}`,
				StringProto
			)
		);
		const inviteDataRef = database.ref(
			`${namespace}/inviteCodes/${inviteCode}`
		);
		const inviteData = (await inviteDataRef.once('value')).val() || {};

		const plan =
			inviteData.plan in CyphPlans ? inviteData.plan : CyphPlans.Free;

		if (
			emailSplit.length !== 2 ||
			(userRecord.providerData &&
				userRecord.providerData.find(
					o =>
						o.providerId !==
						firebase.auth.EmailAuthProvider.PROVIDER_ID
				)) ||
			typeof inviteData.inviterUsername !== 'string' ||
			username.length < config.planConfig[plan].usernameMinLength ||
			(await usernameBlacklisted(
				namespace,
				username,
				inviteData.reservedUsername
			))
		) {
			console.error(
				`Deleting user: ${JSON.stringify({
					emailSplit,
					inviteCode,
					inviteData,
					planConfig: config.planConfig[plan],
					username,
					userRecord
				})}`
			);

			return auth.deleteUser(userRecord.uid);
		}

		return Promise.all([
			database.ref(`${namespace}/pendingSignups/${username}`).set({
				timestamp: admin.database.ServerValue.TIMESTAMP,
				uid: userRecord.uid
			}),
			sendMailInternal(
				'user-registrations@cyph.com',
				`Cyph User Registration: ${userRecord.email}`
			),
			removeItem(namespace, `pendingSignupInviteCodes/${username}`),
			setItem(
				namespace,
				`users/${username}/inviteCode`,
				StringProto,
				inviteCode,
				true
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
