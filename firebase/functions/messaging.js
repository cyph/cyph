const sendMessage	= async (database, messaging, url, body) => {
	const ref		= database.ref(`${url}/messagingTokens`);
	const tokens	= Object.keys((await ref.once('value')).val() || {});

	if (tokens.length < 1) {
		return false;
	}

	const response	= await messaging.sendToDevice(tokens, {
		notification: {
			body,
			icon: 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png',
			title: 'Cyph'
		}
	});

	const failures	= response.results.filter(o => !!o.error);

	await Promise.all(failures.map(async (_, i) => ref.child(tokens[i]).remove())).catch(() => {});

	return response.successCount > 0;
};


module.exports	= {sendMessage};
