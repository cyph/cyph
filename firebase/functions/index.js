const functions	= require('firebase-functions');
const storage	= require('@google-cloud/storage')();


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
			]);
		});
	})
;


exports.userDisconnect	=
	functions.database.ref('users/{user}/clientConnections/{clientConnection}').onDelete(e => {
		e.data.ref.parent.once('value').then(clientConnections => {
			if (clientConnections.exists()) {
				return;
			}

			const userRef	= e.data.ref.parent.parent;

			if (userRef.key.length < 1) {
				throw new Error('INVALID USER REF');
			}

			return Promise.all([
				userRef.child('presence').remove(),
				storage.file(`users/${userRef.key}/presence`).delete()
			]);
		});
	})
;
