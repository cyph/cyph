import {random} from '../cyph/util/random';
import {uuid} from '../cyph/util/uuid';
import {sleep} from '../cyph/util/wait/sleep';

const getID = () => `test-${uuid(true)}`;

const getChannelID = async (cyphID: string, maxSleep: number) => {
	if (maxSleep > 0) {
		await sleep(random(maxSleep));
	}

	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	return (
		await fetch(
			`https://master-dot-cyphme.appspot.com/channels/${cyphID}`,
			{
				body: Object.entries({channelID: getID()}).reduce(
					(data, [k, v]) => {
						data.append(k, v);
						return data;
					},
					new FormData()
				),
				method: 'POST'
			}
		)
	).text();
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
