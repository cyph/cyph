import {random} from '../cyph/util/random';
import {request} from '../cyph/util/request';
import {uuid} from '../cyph/util/uuid';
import {sleep} from '../cyph/util/wait';

const getID = () => `test-${uuid(true)}`;

const getChannelID = async (cyphID: string, maxSleep: number) => {
	if (maxSleep > 0) {
		await sleep(random(maxSleep));
	}

	return request({
		data: {
			channelID: getID()
		},
		method: 'POST',
		url: `https://master-dot-cyphme.appspot.com/channels/${cyphID}`
	});
};

describe('backend/channels', () => {
	it('successfully handles concurrency', async () => {
		const results = await Promise.all(
			(<[string, number][]> [
				...new Array(25).fill(0).map(() => [getID(), 0]),
				...new Array(25).fill(0).map(() => [getID(), 5000])
			]).map(async ([cyphID, maxSleep]) =>
				Promise.all([
					getChannelID(cyphID, maxSleep),
					getChannelID(cyphID, maxSleep)
				])
			)
		);

		for (const [aliceChannelID, bobChannelID] of results) {
			expect(aliceChannelID).toBe(bobChannelID);
		}
	});
});
