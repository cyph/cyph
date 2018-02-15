const firebase						= require('firebase');
const admin							= require('firebase-admin');
const functions						= require('firebase-functions');
const {StringProto}					= require('./proto');
const {retryUntilSuccessful, sleep}	= require('./util');

const {
	auth,
	database,
	functionsUser,
	getItem,
	messaging,
	removeItem,
	setItem,
	storage
}	= require('./database-service')(functions.config(), true);

const {notify}	= require('./notify')(database, messaging);


const channelDisconnectTimeout	= 2500;

const getURL	= (adminRef, namespace) => {
	const url	= adminRef.toString().split(
		`${adminRef.root.toString()}${namespace ? `${namespace}/` : ''}`
	)[1];

	if (!url) {
		throw new Error('Cannot get URL from input.');
	}

	return url;
};


exports.channelDisconnect	=
	functions.database.ref('{namespace}/channels/{channel}/disconnects/{user}').onWrite(
		async e => {
			if (!e.data.exists()) {
				return;
			}

			const startingValue	= e.data.val();

			await sleep(Math.max(channelDisconnectTimeout - (Date.now() - startingValue), 0));

			if (startingValue !== (await e.data.ref.once('value')).val()) {
				return;
			}

			const doomedRef	= e.data.ref.parent.parent;

			if (doomedRef.key.length < 1) {
				throw new Error('INVALID DOOMED REF');
			}

			return removeItem(e.params.namespace, `channels/${doomedRef.key}`);
		}
	)
;


/*
TODO: Handle this as a cron job that searches for folders
	with multiple items and deletes all but the oldest.

exports.itemHashChange	=
	functions.database.ref('{namespace}').onUpdate(async e => {
		if (!e.data.exists() || e.data.key !== 'hash') {
			return;
		}

		const hash	= e.data.val();

		if (typeof hash !== 'string') {
			return;
		}

		const url		= getURL(e.data.adminRef.parent);

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
	})
;
*/


exports.itemRemoved	=
	functions.database.ref('{namespace}').onDelete(async e => {
		if (e.data.exists()) {
			return;
		}

		return removeItem(e.params.namespace, getURL(e.data.adminRef, e.params.namespace));
	})
;


exports.userConsumeInvite	=
	functions.database.ref('{namespace}/users/{user}/inviteCode').onCreate(async e => {
		const userRef		= e.data.ref.parent;

		if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		const inviteCode	= await getItem(
			e.params.namespace,
			`users/${userRef.key}/inviteCode`,
			StringProto
		);

		if (!inviteCode) {
			return;
		}

		const inviterRef		= database.ref(`${e.params.namespace}/inviteCodes/${inviteCode}`);
		const inviterUsername	= (await inviterRef.once('value')).val() || '';

		return Promise.all([
			inviterRef.remove(),
			setItem(
				e.params.namespace,
				`users/${userRef.key}/inviterUsernamePlaintext`,
				StringProto,
				inviterUsername
			),
			!inviterUsername ?
				undefined :
				removeItem(
					e.params.namespace,
					`users/${inviterUsername}/inviteCodes/${inviteCode}`
				)
		]);
	})
;


exports.userDisconnect	=
	functions.database.ref('{namespace}/users/{user}/clientConnections').onDelete(async e => {
		const userRef	= e.data.ref.parent;

		if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		return removeItem(e.params.namespace, `users/${userRef.key}/presence`);
	})
;


exports.userEmailSet	=
	functions.database.ref('{namespace}/users/{user}/email').onWrite(async e => {
		const userRef	= e.data.ref.parent;

		if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		const emailRef	= database.ref(`${namespace}/users/${username}/emailInternal`);

		const email		= await getItem(
			e.params.namespace,
			`users/${userRef.key}/email`,
			StringProto
		).catch(
			() => undefined
		);

		if (email) {
			return emailRef.set(email);
		}
		else {
			return emailRef.remove();
		}
	})
;


exports.userRegister	=
	functionsUser.onCreate(async e => {
		const emailSplit	= (e.data.email || '').split('@');

		if (emailSplit.length !== 2 || (
			e.data.providerData && (
				e.data.providerData.length !== 1 ||
				e.data.providerData[0].providerId !== firebase.auth.EmailAuthProvider.PROVIDER_ID
			)
		)) {
			return auth.deleteUser(e.data.uid);
		}

		const username	= emailSplit[0];
		const namespace	= emailSplit[1].replace(/\./g, '_');

		return database.ref(`${namespace}/pendingSignups/${username}`).set({
			timestamp: admin.database.ServerValue.TIMESTAMP,
			uid: e.data.uid
		});
	})
;
