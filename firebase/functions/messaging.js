const {normalize} = require('./util');

const sendMessage = async (
	database,
	messaging,
	namespace,
	username,
	body,
	{
		actions,
		badge,
		highPriority,
		inboxStyle = true,
		notificationID,
		notificationType,
		ring,
		tag
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

	return (await Promise.all(
		tokens
			.filter(token => tokenPlatforms[token] !== 'electron')
			.map(async token => {
				const platform = tokenPlatforms[token];

				const notification = {
					badge,
					body,
					tag,
					title: 'Cyph',
					...(ring && platform === 'android' ?
						{sound: 'ringtone'} :
						{}),
					...(platform === 'unknown' || platform === 'web' ?
						{
							icon:
								'https://www.cyph.com/assets/img/favicon/favicon-256x256.png'
						} :
						{})
				};

				const data = {
					...notification,
					notificationID,
					notificationType,
					...(actions ? {actions} : {}),
					...(highPriority ? {priority: 2} : {}),
					...(inboxStyle ? {style: 'inbox'} : {}),
					...(tag && platform === 'ios' ? {'thread-id': tag} : {})
				};

				const payload = {
					data,
					notification,
					to: token
				};

				return new Promise(resolve => {
					messaging.send(payload, async (err, _RESPONSE) => {
						if (err) {
							await ref.child(token).remove();
							resolve(false);
						}
						else {
							resolve(true);
						}
					});
				});
			})
	)).reduce((a, b) => a || b, false);
};

module.exports = {sendMessage};
