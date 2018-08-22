const sendMessage	= async (database, messaging, namespace, username, body) => {
	const ref		= database.ref(`${namespace}/users/${normalize(username)}/messagingTokens`);
	const tokens	= Object.keys((await ref.once('value')).val() || {});

	if (tokens.length < 1) {
		return false;
	}

	const data		= {body, title: 'Cyph'};

	const response	= await messaging.sendToDevice(tokens, {data, notification: {
		...data,
		icon: 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png'
	}});

	await Promise.all(
		response.results.
			filter(o => !!o.error).
			map(async (_, i) => ref.child(tokens[i]).remove())
	).
		catch(() => {})
	;

	return response.successCount > 0;
};


module.exports	= {sendMessage};
