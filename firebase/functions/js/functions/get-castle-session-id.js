import {util} from '@cyph/sdk';
import {getOrSetDefaultSimple, onCall} from '../init.js';

const {normalizeArray, uuid} = util;

export const getCastleSessionID = onCall(
	async (data, namespace, getUsername) => {
		const [userA, userB] = normalizeArray([
			data.username || '',
			await getUsername()
		]);

		if (!userA || !userB) {
			return '';
		}

		return getOrSetDefaultSimple(
			namespace,
			`castleSessions/${userA}/${userB}/id`,
			() => uuid(true)
		);
	}
);
