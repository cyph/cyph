import {util} from '@cyph/sdk';
import {isUsernameBlacklisted, onCall, validateInput} from '../init.js';

const {normalize} = util;

export const usernameBlacklisted = onCall(
	async (data, namespace, getUsername) => {
		const username = normalize(validateInput(data.username));

		return {
			isBlacklisted: await isUsernameBlacklisted(namespace, username)
		};
	}
);
