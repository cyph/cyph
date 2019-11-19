const {normalize} = require('./util');

const sendMessage = async (
	database,
	messaging,
	namespace,
	username,
	body,
	{inboxStyle = true, tag} = {}
) => {
	const ref = database.ref(
		`${namespace}/users/${normalize(username)}/messagingTokens`
	);

	const tokenPlatforms = (await ref.once('value')).val() || {};
	const tokens = Object.keys(tokenPlatforms);

	if (tokens.length < 1) {
		return false;
	}

	const notification = {
		body,
		tag,
		title: 'Cyph',
		...(inboxStyle ? {style: 'inbox'} : {})
	};

	return (await Promise.all(
		[
			[
				tokens.filter(token => tokenPlatforms[token] === 'android'),
				{data: notification}
			],
			[
				tokens.filter(
					token =>
						// tokenPlatforms[token] === 'electron' ||
						tokenPlatforms[token] === 'ios'
				),
				{notification}
			],
			[
				tokens.filter(
					token =>
						tokenPlatforms[token] === 'unknown' ||
						tokenPlatforms[token] === 'web'
				),
				{
					notification: {
						...notification,
						icon:
							'https://www.cyph.com/assets/img/favicon/favicon-256x256.png'
					}
				}
			]
		].map(async ([platformTokens, payload]) => {
			if (platformTokens.length < 1) {
				return false;
			}

			const response = await messaging.sendToDevice(
				platformTokens,
				payload
			);

			await Promise.all(
				response.results
					.filter(o => !!o.error)
					.map(async (_, i) => ref.child(platformTokens[i]).remove())
			).catch(() => {});

			return response.successCount > 0;
		})
	)).reduce((a, b) => a || b, false);
};

module.exports = {sendMessage};
