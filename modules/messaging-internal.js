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
	const tokens =
		/* For now, make special temporary exception to receive notifications in desktop app */
		username === 'cyph' || username === 'josh' || username === 'ryan' ?
			Object.keys(tokenPlatforms) :
			Object.keys(tokenPlatforms).filter(
				token => tokenPlatforms[token] !== 'electron'
			);

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

	const tokenChunkSize = 500;
	const tokenGroups = tokens.reduce(
		(chunks, token) =>
			chunks[chunks.length - 1].length >= tokenChunkSize ?
				[...chunks, [token]] :
				[...chunks.slice(0, -1), [...chunks[chunks.length - 1], token]],
		[[]]
	);

	let success = false;

	for (const tokenGroup of tokenGroups) {
		const {responses, successCount} = await messaging.sendMulticast({
			...message,
			tokens: tokenGroup
		});

		if (responses.length !== tokenGroup.length) {
			throw new Error('Invalid sendMulticast response.');
		}

		for (let i = 0; i < responses.length; ++i) {
			const response = responses[i];
			const token = tokenGroup[i];

			if (!response.success) {
				await ref.child(token).remove();
			}
		}

		success = success || successCount > 0;
	}

	return success;
};
