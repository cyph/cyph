import {sendEmailInternal} from '../email.js';
import {onCall, removeItem} from '../init.js';

export const confirmMasterKey = onCall(
	async (data, namespace, getUsername, testEnvName) => {
		const username = await getUsername();

		if (!username) {
			return;
		}

		await Promise.all([
			removeItem(namespace, `users/${username}/masterKeyUnconfirmed`),
			sendEmailInternal(
				'user-confirmations@cyph.com',
				`${
					testEnvName ?
						`${testEnvName.replace(/^(.)/, s =>
							s.toUpperCase()
						)}: ` :
						''
				}Cyph User Confirmation`,
				`${username}@${namespace.replace(/_/g, '.')}`
			)
		]);
	}
);
