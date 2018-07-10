const cors										= require('cors')({origin: true});
const firebase									= require('firebase');
const admin										= require('firebase-admin');
const functions									= require('firebase-functions');
const {emailRegex}								= require('./email-regex');
const namespaces								= require('./namespaces');
const {normalize, retryUntilSuccessful, sleep}	= require('./util');

const {
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


exports.userConsumeInvite	= functions.database.ref(
	'{namespace}/users/{user}/inviteCode'
).onCreate(async (data, {params}) => {
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
	const internalURL				= `${params.namespace}/users/${username}/internal`;
	const emailRef					= database.ref(`${internalURL}/email`);
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

	const registrationEmailSent		= (await registrationEmailSentRef.once('value')).val();

	if (registrationEmailSent) {
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

	if (!notification || !notification.target || isNaN(notification.type) || !metadata.id) {
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
			const userPath	= `${params.namespace}/users/${notification.target}`;

			const hasFile	= async () =>
				(
					await database.ref(`${userPath}/fileReferences/${metadata.id}`).once('value')
				).exists()
			;

			const path		=
				notification.type === NotificationTypes.File ?
					!(await hasFile()) ?
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
					:
				notification.type === NotificationTypes.Message && metadata.castleSessionID ?
					`unreadMessages/${metadata.castleSessionID}` :
					undefined
			;

			if (!path) {
				return;
			}

			await database.ref(`${userPath}/${path}/${metadata.id}`).set({
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

	return database.ref(`${namespace}/pendingSignups/${username}`).set({
		timestamp: admin.database.ServerValue.TIMESTAMP,
		uid: userRecord.uid
	});
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
				`Sign in at ${namespaces[params.namespace].accountsURL}login.`
		),
		registrationEmailSentRef.set(true)
	]);
});
