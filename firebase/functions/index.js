const cors					= require('cors')({origin: true});
const firebase				= require('firebase');
const admin					= require('firebase-admin');
const functions				= require('firebase-functions');
const {sendMailInternal}	= require('./email');
const {emailRegex}			= require('./email-regex');
const namespaces			= require('./namespaces');
const {sleep, uuid}			= require('./util');

const {
	AccountContactState,
	AccountFileRecord,
	AccountUserProfile,
	NotificationTypes,
	NumberProto,
	StringProto
}	= require('./proto');

const {
	auth,
	database,
	functionsUser,
	getHash,
	getItem,
	hasItem,
	messaging,
	removeItem,
	setItem,
	storage
}	= require('./database-service')(functions.config(), true);

const {notify}	= require('./notify')(database, messaging);


const channelDisconnectTimeout	= 5000;

const getRealUsername	= async (namespace, username) => {
	try {
		const realUsername	=
			(await database.ref(
				`${namespace}/users/${username}/internal/realUsername`
			).once('value')).val()
		;

		if (realUsername) {
			return realUsername;
		}
	}
	catch {}

	return username;
};

const getName	= async (namespace, username) => {
	try {
		const name	=
			(await database.ref(
				`${namespace}/users/${username}/internal/name`
			).once('value')).val()
		;

		if (name) {
			return name;
		}
	}
	catch {}

	return getRealUsername(namespace, username);
};

const getURL	= (adminRef, namespace) => {
	const url	= adminRef.toString().split(
		`${adminRef.root.toString()}${namespace ? `${namespace}/` : ''}`
	)[1];

	if (!url) {
		throw new Error('Cannot get URL from input.');
	}

	return url;
};

const validateInput	= (input, regex) => {
	if (!input || input.indexOf('/') > -1 || (regex && !regex.test(input))) {
		throw new Error('Invalid data.');
	}

	return input;
};

const onCall	= f => functions.https.onCall(async (data, context) =>
	f(
		data,
		context,
		validateInput(data.namespace.replace(/\./g, '_')),
		async () => context.auth ?
			(await auth.getUser(context.auth.uid)).email.split('@')[0] :
			undefined
	)
);

const onRequest	= f => functions.https.onRequest((req, res) => cors(req, res, async () => {
	try {
		await f(req, res, validateInput(req.body.namespace.replace(/\./g, '_')));
	}
	catch (err) {
		console.error(err);
		res.status(500);
		res.send({error: true});
	}
}));


exports.acceptPseudoRelationship	= onCall(async (data, context, namespace, getUsername) => {
	const id				= validateInput(data.id);
	const relationshipRef	= database.ref(`${namespace}/pseudoRelationships/${id}`);

	const [relationshipVal, bob]	= await Promise.all([
		relationshipRef.once('value').then(o => o.val()),
		getUsername()
	]);

	const alice	= relationshipVal.aliceUsername;
	const email	= relationshipVal.bobEmail;

	if (!alice || !bob) {
		throw new Error('Users not found.');
	}

	const {name}	= await getItem(
		namespace,
		`users/${alice}/contacts/${id}`,
		AccountContactState
	);

	await Promise.all([
		relationshipRef.remove(),
		removeItem(
			namespace,
			`users/${alice}/contacts/${id}`
		),
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
			hasEmail ? undefined : setItem(
				namespace,
				`users/${bob}/email`,
				StringProto,
				email,
				true
			)
		),
		getName(namespace, alice).then(async aliceName => notify(
			namespace,
			alice,
			`Contact Confirmation from ${email}`,
			`${aliceName}, ${name} has accepted your contact request.`
		))
	]);

	return alice;
});


exports.channelDisconnect	= functions.database.ref(
	'{namespace}/channels/{channel}/disconnects/{user}'
).onWrite(async ({after: data}, {params}) => {
	if (!data.exists()) {
		return;
	}

	const startingValue	= data.val();

	await sleep(Math.max(channelDisconnectTimeout - (Date.now() - startingValue), 0));

	if (startingValue !== (await data.ref.once('value')).val()) {
		return;
	}

	const doomedRef	= data.ref.parent.parent;

	if (doomedRef.key.length < 1) {
		throw new Error('INVALID DOOMED REF');
	}

	return removeItem(params.namespace, `channels/${doomedRef.key}`);
});


exports.checkInviteCode	= onCall(async (data, context, namespace, getUsername) => {
	const inviteCode		= validateInput(data.inviteCode);
	const inviterRef		= database.ref(`${namespace}/inviteCodes/${inviteCode}`);
	const inviterUsername	= (await inviterRef.once('value')).val() || '';

	return {isValid: !!inviterUsername};
});


/*
TODO: Handle this as a cron job that searches for folders
	with multiple items and deletes all but the oldest.

exports.itemHashChange	= functions.database.ref(
	'{namespace}'
).onUpdate(async ({after: data}, {params}) => {
	if (!data.exists() || data.key !== 'hash') {
		return;
	}

	const hash	= data.val();

	if (typeof hash !== 'string') {
		return;
	}

	const url		= getURL(data.adminRef.parent);

	const files	= await Promise.all(
		(await storage.getFiles({prefix: `${url}/`}))[0].map(async file => {
			const [metadata]	= await file.getMetadata();

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
			const [exists]	= await o.file.exists();
			if (!exists) {
				return;
			}

			await o.file.delete();
		});
	}
});
*/


exports.itemRemoved	= functions.database.ref(
	'{namespace}'
).onDelete(async (data, {params}) => {
	if (data.exists()) {
		return;
	}

	return removeItem(params.namespace, getURL(data.adminRef, params.namespace));
});


exports.rejectPseudoRelationship	= onCall(async (data, context, namespace, getUsername) => {
	const id				= validateInput(data.id);
	const relationshipRef	= database.ref(`${namespace}/pseudoRelationships/${id}`);

	const {aliceUsername}	= await relationshipRef.once('value').then(o => o.val());

	if (!aliceUsername) {
		throw new Error('Relationship request not found.');
	}

	await Promise.all([
		relationshipRef.remove(),
		removeItem(namespace, `users/${aliceUsername}/contacts/${id}`)
	]);
});


exports.requestPseudoRelationship	= onCall(async (data, context, namespace, getUsername) => {
	const {accountsURL}		= namespaces[namespace];
	const email				= validateInput(data.email, emailRegex);
	const name				= validateInput(data.name);
	const id				= uuid();
	const username			= await getUsername();
	const relationshipRef	= database.ref(`${namespace}/pseudoRelationships/${id}`);

	await Promise.all([
		relationshipRef.set({aliceUsername: username, bobEmail: email}),
		setItem(
			namespace,
			`users/${username}/contacts/${id}`,
			AccountContactState,
			{email, name, state: AccountContactState.States.OutgoingRequest},
			true
		),
		getName(namespace, username).then(async aliceName => sendMailInternal(
			email,
			`Contact Request from ${aliceName}`,
			`${name ? `${name}, ` : ''}${aliceName} has invited you to an encrypted Cyph chat.\n\n` +
			`Click here to accept: ${accountsURL}accept/${id}\n` +
			`Click here to reject: ${accountsURL}reject/${id}`
		))
	]);
});


exports.userConsumeInvite	= functions.database.ref(
	'{namespace}/users/{user}/inviteCode'
).onWrite(async (data, {params}) => {
	if (!data.after.val()) {
		return;
	}

	const username		= params.user;
	const inviteCode	= await getItem(
		params.namespace,
		`users/${username}/inviteCode`,
		StringProto
	);

	if (!inviteCode) {
		return;
	}

	const inviterRef		= database.ref(`${params.namespace}/inviteCodes/${inviteCode}`);
	const inviterUsername	= (await inviterRef.once('value')).val() || '';

	return Promise.all([
		inviterRef.remove(),
		setItem(
			params.namespace,
			`users/${username}/inviterUsernamePlaintext`,
			StringProto,
			inviterUsername
		),
		!inviterUsername ?
			undefined :
			removeItem(
				params.namespace,
				`users/${inviterUsername}/inviteCodes/${inviteCode}`
			)
	]);
});


exports.userContactSet	= functions.database.ref(
	'{namespace}/users/{user}/contacts/{contact}'
).onWrite(async ({after: data}, {params}) => {
	const contact			= params.contact;
	const username			= params.user;
	const contactURL		= `users/${username}/contacts/${contact}`;
	const otherContactURL	= `users/${contact}/contacts/${username}`;

	const contactState		= (await getItem(
		params.namespace,
		contactURL,
		AccountContactState
	).catch(
		() => ({state: undefined})
	)).state;

	/* If removing contact, delete on other end */
	if (contactState === undefined) {
		return removeItem(params.namespace, otherContactURL);
	}

	const pseudoAccountRef	= database.ref(`${params.namespace}/users/${username}/pseudoAccount`);

	const [otherContactState, otherContactStateNewData]	= await Promise.all([
		getItem(
			params.namespace,
			otherContactURL,
			AccountContactState
		).then(
			o => o.state
		).catch(
			() => undefined
		),
		pseudoAccountRef.once('value').then(async o => !o.val() ? {} : {
			email: ' ',
			name: (await getItem(
				params.namespace,
				`users/${username}/publicProfile`,
				AccountUserProfile,
				true,
				true
			).catch(
				() => ({})
			)).name
		})
	]);

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
							{state: AccountContactState.States.OutgoingRequest},
							true
						),
						setItem(
							params.namespace,
							otherContactURL,
							AccountContactState,
							{
								...otherContactStateNewData,
								state: AccountContactState.States.IncomingRequest
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
							state: AccountContactState.States.OutgoingRequest
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
							state: AccountContactState.States.IncomingRequest
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


exports.userDisconnect	= functions.database.ref(
	'{namespace}/users/{user}/clientConnections'
).onDelete(async (data, {params}) => {
	const username	= params.user;

	return removeItem(params.namespace, `users/${username}/presence`);
});


exports.userEmailSet	= functions.database.ref(
	'{namespace}/users/{user}/email'
).onWrite(async ({after: data}, {params}) => {
	const username					= params.user;
	const userURL					= `${params.namespace}/users/${username}`;
	const internalURL				= `${userURL}/internal`;
	const emailRef					= database.ref(`${internalURL}/email`);
	const pseudoAccountRef			= database.ref(`${userURL}/pseudoAccount`);
	const registrationEmailSentRef	= database.ref(`${internalURL}/registrationEmailSent`);

	const email						= await getItem(
		params.namespace,
		`users/${username}/email`,
		StringProto
	).catch(
		() => undefined
	);

	if (email && emailRegex.test(email)) {
		await emailRef.set(email);
	}
	else {
		await emailRef.remove();
	}

	const [pseudoAccount, registrationEmailSent]	=
		(await Promise.all([
			pseudoAccountRef.once('value'),
			registrationEmailSentRef.once('value')
		])).map(o => o.val())
	;

	if (pseudoAccount || registrationEmailSent) {
		return;
	}

	const [realUsername]	= await Promise.all([
		getRealUsername(params.namespace, username),
		registrationEmailSentRef.set(true)
	]);

	await notify(
		params.namespace,
		username,
		`Your Registration is Being Processed, ${realUsername}`,
		`We've received your registration request, and your account is on the way!\n` +
			`You'll receive a follow-up email as soon as one of the Cyph founders ` +
			`(Ryan or Josh) activates your account using their personal ` +
			`Air Gapped Signing Environment.`
	);
});


/* TODO: Translations and user block lists. */
exports.userNotification	= functions.database.ref(
	'{namespace}/users/{user}/notifications/{notification}'
).onCreate(async (data, {params}) => {
	const username		= params.user;
	const notification	= data.val();
	const metadata		= typeof notification.metadata === 'object' ? notification.metadata : {};
	const now			= Date.now();

	if (!notification || !notification.target || isNaN(notification.type)) {
		return;
	}

	await Promise.all([
		(async () => {
			const [senderName, senderUsername, targetName]	= await Promise.all([
				getName(params.namespace, username),
				getRealUsername(params.namespace, username),
				getName(params.namespace, notification.target)
			]);

			const {eventDetails, subject, text}	=
				notification.type === NotificationTypes.CalendarEvent ?
					{
						eventDetails: {
							description: metadata.description,
							endTime: isNaN(metadata.endTime) ? now + 3600000 : metadata.endTime,
							inviterUsername: senderUsername,
							location: metadata.location,
							startTime:
								isNaN(metadata.startTime) ? now + 1800000 : metadata.startTime
							,
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
						text:
							`${targetName}, ${senderName} has accepted your contact request.`
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
					{
						subject: `Sup Dog, it's ${senderUsername}`,
						text: `${targetName}, ${senderName} says yo.`
					}
			;

			await notify(
				params.namespace,
				notification.target,
				subject,
				text,
				eventDetails,
				true
			);
		})(),
		(async () => {
			if (!metadata.id || typeof metadata.id !== 'string' || metadata.id.indexOf(',') > -1) {
				return;
			}

			const userPath	= `${params.namespace}/users/${notification.target}`;

			const hasFile	= async () =>
				(
					await database.ref(`${userPath}/fileReferences/${metadata.id}`).once('value')
				).exists()
			;

			const [child, path]		=
				(
					notification.type === NotificationTypes.Call &&
					(metadata.callType === 'audio' || metadata.callType === 'video') &&
					(typeof metadata.expires === 'number' && metadata.expires > Date.now())
				) ?
					[false, `incomingCalls/${
						metadata.callType
					},${
						username
					},${
						metadata.id
					},${
						metadata.expires.toString()
					}`] :
				notification.type === NotificationTypes.File ?
					[true, !(await hasFile()) ?
						(
							'unreadFiles/' + (
								(
									!isNaN(metadata.fileType) &&
									metadata.fileType in AccountFileRecord.RecordTypes
								) ?
									metadata.fileType :
									AccountFileRecord.RecordTypes.File
							).toString()
						) :
						undefined
					] :
				notification.type === NotificationTypes.Message && metadata.castleSessionID ?
					[true, `unreadMessages/${metadata.castleSessionID}`] :
					[]
			;

			if (!path) {
				return;
			}

			await database.ref(`${userPath}/${path}${child ? `/${metadata.id}` : ''}`).set({
				data: '',
				hash: '',
				timestamp: admin.database.ServerValue.TIMESTAMP
			});
		})()
	]);
});


exports.userPublicProfileSet	= functions.database.ref(
	'{namespace}/users/{user}/publicProfile'
).onWrite(async ({after: data}, {params}) => {
	const username			= params.user;
	const internalURL		= `${params.namespace}/users/${username}/internal`;
	const nameRef			= database.ref(`${internalURL}/name`);
	const realUsernameRef	= database.ref(`${internalURL}/realUsername`);

	const publicProfile		= await getItem(
		params.namespace,
		`users/${username}/publicProfile`,
		AccountUserProfile,
		true,
		true
	).catch(
		() => undefined
	);

	return Promise.all([
		nameRef.set(
			publicProfile && publicProfile.name ?
				publicProfile.name :
				username
		),
		realUsernameRef.set(
			publicProfile && publicProfile.realUsername.toLowerCase() === username ?
				publicProfile.realUsername :
				username
		)
	]);
});


exports.userRegister	= functionsUser.onCreate(async (userRecord, {params}) => {
	const emailSplit	= (userRecord.email || '').split('@');

	if (emailSplit.length !== 2 || (
		userRecord.providerData && userRecord.providerData.find(o =>
			o.providerId !== firebase.auth.EmailAuthProvider.PROVIDER_ID
		)
	)) {
		console.error(`Deleting user: ${JSON.stringify(userRecord)}`);
		return auth.deleteUser(userRecord.uid);
	}

	const username	= emailSplit[0];
	const namespace	= emailSplit[1].replace(/\./g, '_');

	return Promise.all([
		database.ref(`${namespace}/pendingSignups/${username}`).set({
			timestamp: admin.database.ServerValue.TIMESTAMP,
			uid: userRecord.uid
		}),
		sendMailInternal(
			'user-registrations@cyph.com',
			`Cyph User Registration: ${userRecord.email}`
		)
	]);
});


exports.userRegisterConfirmed	= functions.database.ref(
	'{namespace}/users/{user}/certificate'
).onCreate(async (data, {params}) => {
	const username	= params.user;

	const [name, realUsername, registrationEmailSentRef]	= await Promise.all([
		getName(params.namespace, username),
		getRealUsername(params.namespace, username),
		database.ref(`${params.namespace}/users/${username}/internal/registrationEmailSent`)
	]);

	await Promise.all([
		notify(
			params.namespace,
			username,
			`Welcome to Cyph, ${realUsername}`,
			`Congratulations ${name}, your account is now activated!\n` +
				`Sign in at ${namespaces[params.namespace].accountsURL}login.` +
				/* Temporary, pending app's public release */
				(
					params.namespace !== 'cyph_ws' ? '' : (
						`\nYou'll receive an invite to access the iOS app shortly, ` +
						`and the Android app is available here: ` +
						`https://play.google.com/apps/testing/com.cyph.app`
					)
				)
		),
		registrationEmailSentRef.set(true)
	]);
});
