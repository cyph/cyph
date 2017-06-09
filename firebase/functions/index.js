const functions	= require('firebase-functions');


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

			return e.data.ref.parent.parent.remove();
		});
	})
;
