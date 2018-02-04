const firebase		= require('firebase');
const admin			= require('firebase-admin');
const functions		= require('firebase-functions');
const potassium		= require('./potassium');
const {StringProto}	= require('./proto');
const {sleep}		= require('./util');

const {
	auth,
	database,
	functionsUser,
	getItem,
	removeItem,
	setItem,
	storage
}	= require('./database-service')(functions.config());


const channelDisconnectTimeout	= 2500;


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
		const namespace	= emailSplit[1];

		return database.ref(`${namespace}/pendingSignups/${username}`).set({
			timestamp: admin.database.ServerValue.TIMESTAMP,
			uid: e.data.uid
		});
	})
;
