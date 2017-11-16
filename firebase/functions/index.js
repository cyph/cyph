const firebase		= require('firebase');
const admin			= require('firebase-admin');
const functions		= require('firebase-functions');
admin.initializeApp(functions.config().firebase);
const auth			= admin.auth();
const database		= admin.database();
const functionsUser	= functions.auth.user();
const storage		= require('@google-cloud/storage')().bucket(
	`${functions.config().project.id}.appspot.com`
);


const channelDisconnectTimeout	= 2500;


exports.channelDisconnect	=
	functions.database.ref('channels/{channel}/disconnects/{user}').onWrite(e => {
		if (!e.data.exists()) {
			return;
		}

		const startingValue	= e.data.val();

		new Promise(resolve =>
			setTimeout(
				resolve,
				Math.max(channelDisconnectTimeout - (Date.now() - startingValue), 0)
			)
		).then(() =>
			e.data.ref.once('value')
		).then(newData => {
			if (startingValue !== newData.val()) {
				return;
			}

			const doomedRef	= e.data.ref.parent.parent;

			if (doomedRef.key.length < 1) {
				throw new Error('INVALID DOOMED REF');
			}

			return Promise.all([
				doomedRef.remove(),
				storage.deleteFiles({prefix: `channels/${doomedRef.key}/`})
			]).catch(
				() => {}
			);
		});
	})
;


exports.userDisconnect	=
	functions.database.ref('users/{user}/clientConnections').onDelete(e => {
		const userRef	= e.data.ref.parent;

		if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		return Promise.all([
			userRef.child('presence').remove(),
			storage.file(`users/${userRef.key}/presence`).delete()
		]).catch(
			() => {}
		);
	})
;


exports.userRegistration	=
	functionsUser.onCreate(e => {
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
