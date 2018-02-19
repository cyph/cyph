const sendMessage	= async (database, messaging, url, body) => {
	const ref		= database.ref(`${url}/messagingTokens`);
	const tokens	= Object.keys((await ref.once('value')).val() || {});

	if (tokens.length < 1) {
		return false;
	}

	const results	= await Promise.all(tokens.map(async token => messaging.send({
		token,
		webpush: {
			notification: {
				body,
				icon: 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png',
				title: 'Cyph'
			}
		}
	}).
		then(() => ({success: true, token})).
		catch(() => ({success: false, token}))
	));

	const failures	= results.filter(o => !o.success);

	await Promise.all(failures.map(async ({token}) => ref.child(token).remove())).catch(() => {});

	return results.length > failures.length;
};


module.exports	= {sendMessage};
