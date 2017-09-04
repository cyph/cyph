const firebase	= require('firebase-admin');
const functions	= require('firebase-functions');
firebase.initializeApp(functions.config().firebase);
const database	= firebase.database();
const storage	= require('@google-cloud/storage')().bucket(
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
	functions.database.ref('users/{user}/certificateRequest').onCreate(e => {
		if (!e.data.exists()) {
			return;
		}

		const userRef	= e.data.ref.parent;

		if (userRef.key.length < 1) {
			throw new Error('INVALID USER REF');
		}

		return database.ref('certificateRequests').push(userRef.key).catch(() => {});
	})
;
