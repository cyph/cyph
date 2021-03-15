import {util} from '@cyph/sdk';
import {database, onCall} from '../init.js';

const {normalizeArray, uuid} = util;

export const resetCastleSessionID = onCall(
	async (data, namespace, getUsername) => {
		const [userA, userB] = normalizeArray([
			data.username || '',
			await getUsername()
		]);

		if (!userA || !userB) {
			return;
		}

		await database
			.ref(`${namespace}/castleSessions/${userA}/${userB}/id`)
			.set(uuid(true));
	}
);
