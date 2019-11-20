const {normalize} = require('./util');

const sendMessage = async (
	database,
	messaging,
	namespace,
	username,
	body,
	{
		actions,
		badge = 0,
		highPriority,
		inboxStyle = true,
		notificationID,
		notificationType,
		ring,
		tag,
		timeToLive
	} = {}
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
		badge: badge.toString(),
		body,
		tag,
		title: 'Cyph',
		...(ring ? {sound: 'ringtone'} : {})
	};

	const data = {
		...notification,
		notificationID,
		notificationType,
		...(actions ? {actions: JSON.stringify(actions)} : {}),
		...(highPriority ? {priority: '2'} : {}),
		...(inboxStyle ? {style: 'inbox'} : {})
	};

	const messagingOptions =
		typeof timeToLive === 'number' ?
			{timeToLive: timeToLive / 1000} :
			undefined;

	return (await Promise.all(
		[
			[
				tokens.filter(token => tokenPlatforms[token] === 'android'),
				{data, notification}
			],
			[
				tokens.filter(
					token =>
						// tokenPlatforms[token] === 'electron' ||
						tokenPlatforms[token] === 'ios'
				),
				{data, notification}
			],
			[
				tokens.filter(
					token =>
						tokenPlatforms[token] === 'unknown' ||
						tokenPlatforms[token] === 'web'
				),
				{
					data,
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
				payload,
				messagingOptions
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
