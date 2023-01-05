import {util} from '@cyph/sdk';

const {normalize} = util;

const iconURL = 'https://www.cyph.com/assets/img/favicon/favicon-256x256.png';
const title = 'Cyph';

export const sendMessageInternal = async (
	database,
	messaging,
	namespace,
	username,
	body,
	{actions, additionalData, badge, inboxStyle = true, ring = false, tag} = {}
) => {
	namespace = namespace.replace(/\./g, '_');
	username = normalize(username || '');
	body = body.trim();

	if (!namespace || !username) {
		return;
	}

	const ref = database.ref(`${namespace}/users/${username}/messagingTokens`);

	const tokenPlatforms = (await ref.once('value')).val() || {};
	const tokens = Object.keys(tokenPlatforms);

	if (tokens.length < 1) {
		return false;
	}

	const message = {
		android: {
			collapseKey: !ring ? 'cyph-notifications' : undefined,
			notification: {
				channelId: ring ? 'cyph-rings' : 'cyph-notifications',
				priority: ring ? 'max' : 'high',
				sound: ring ? 'ringtone' : undefined,
				tag,
				visibility: 'private'
			},
			priority: 'high'
		},
		apns: {
			aps: {
				alert: {
					body,
					title
				},
				badge,
				contentAvailable: true,
				mutableContent: false,
				threadId: tag
			}
		},
		data: {
			...(inboxStyle ? {style: 'inbox'} : {}),
			...additionalData
		},
		notification: {
			body,
			title
		},
		webpush: {
			notification: {
				actions,
				icon: iconURL,
				requireInteraction: ring,
				tag,
				title
			}
		}
	};

	return (
		await Promise.all(
			/* For now, make special temporary exception to receive notifications in desktop app */
			(username === 'cyph' || username === 'josh' || username === 'ryan' ?
				tokens :
				tokens.filter(token => tokenPlatforms[token] !== 'electron')
			).map(async token => {
				try {
					await messaging.send({...message, token});
					return true;
				}
				catch {
					await ref.child(token).remove();
					return false;
				}
			})
		)
	).reduce((a, b) => a || b, false);
};
