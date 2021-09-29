import {util} from '@cyph/sdk';

const {normalize} = util;

export const sendMessageInternal = async (
	database,
	messaging,
	namespace,
	username,
	body,
	{actions, additionalData, badge, inboxStyle = true, ring, tag} = {}
) => {
	namespace = namespace.replace(/\./g, '_');
	username = normalize(username || '');

	if (!namespace || !username) {
		return;
	}

	const ref = database.ref(`${namespace}/users/${username}/messagingTokens`);

	const tokenPlatforms = (await ref.once('value')).val() || {};
	const tokens = Object.keys(tokenPlatforms);

	if (tokens.length < 1) {
		return false;
	}

	return (
		await Promise.all(
			/* For now, make special temporary exception to receive notifications in desktop app */
			(username === 'cyph' || username === 'josh' || username === 'ryan' ?
				tokens :
				tokens.filter(token => tokenPlatforms[token] !== 'electron')
			).map(async token => {
				const platform = tokenPlatforms[token];

				const notification = {
					badge,
					body: body.trim(),
					sound:
						ring && platform === 'android' ? 'ringtone' : 'default',
					tag,
					title: 'Cyph',
					...(platform === 'android' ?
						{
							android_channel_id: ring ?
									'cyph-rings' :
									'cyph-notifications'
						} :
						{}),
					...(platform === 'unknown' || platform === 'web' ?
						{
							icon: 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png'
						} :
						{})
				};

				const data = {
					'content-available': true,
					'priority': 2,
					'visibility': 1,
					...(actions ? {actions} : {}),
					...(inboxStyle ? {style: 'inbox'} : {}),
					...(tag && platform === 'ios' ? {'thread-id': tag} : {}),
					...additionalData
				};

				const payload = {
					...(platform === 'android' ?
						{data: {...notification, ...data}} :
						{data, notification}),
					priority: 'high',
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
		)
	).reduce((a, b) => a || b, false);
};
