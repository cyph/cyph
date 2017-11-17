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
}	= require('./database-service');


const channelDisconnectTimeout	= 2500;


exports.channelDisconnect	=
	functions.database.ref('channels/{channel}/disconnects/{user}').onWrite(async e => {
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

		return removeItem(`channels/${doomedRef.key}`);
	})
;


exports.userConsumeInvite	=
	functions.database.ref('users/{user}/inviteCode').onCreate(async e => {
		const inviteCode	= (e.data.val() || '').trim();
		const userRef		= e.data.ref.parent;

		if (!inviteCode) {
			return;
		}
		else if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		const inviterRef		= database.ref(`inviteCodes/${inviteCode}`);
		const inviterUsername	= (await inviterRef.once('value')).val() || '';

		return Promise.all([
			inviterRef.remove(),
			setItem(`users/${userRef.key}/inviterUsername`, StringProto, inviterUsername),
			!inviterUsername ?
				undefined :
				removeItem(`users/${inviterUsername}/inviteCodes/${inviteCode}`)
		]);
	})
;


exports.userDisconnect	=
	functions.database.ref('users/{user}/clientConnections').onDelete(async e => {
		const userRef	= e.data.ref.parent;

		if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		return removeItem(`users/${userRef.key}/presence`);
	})
;


exports.userRegistration	=
	functionsUser.onCreate(async e => {
		const emailSplit	= (e.data.email || '').split('@');

		if (
			emailSplit.length !== 2 ||
			e.data.providerData.length !== 1 ||
			e.data.providerData[0].providerId !== firebase.auth.EmailAuthProvider.PROVIDER_ID
		) {
			return auth.deleteUser(e.data.uid);
		}

		const username	= emailSplit[0];

		return database.ref(`pendingSignups/{username}`).set({
			timestamp: admin.database.ServerValue.TIMESTAMP,
			uid: e.data.uid
		});
	})
;
