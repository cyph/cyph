const sendMessage	= async (database, messaging, url, body) => {
	const ref		= database.ref(`${url}/messagingTokens`);
	const tokens	= Object.keys((await ref.once('value')).val() || {});

	const response	= await messaging.sendToDevice(tokens, {
		notification: {
			body,
			icon: 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png',
			title: 'Cyph'
		}
	});

	await Promise.all(
		results.
			filter(result => !!result.error).
			map(async (_, i) => ref.child(tokens[i]).remove())
	).catch(
		() => {}
	);
};


module.exports	= {sendMessage};
