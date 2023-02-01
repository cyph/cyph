import {proto, util} from '@cyph/sdk';
import {database, hasItem, onCall, removeItem} from '../init.js';
import {webSignAlgorithm} from '../modules/websign-algorithm.js';
import {webSignReleaseNotify} from '../websign-release-notify.js';

const {AGSEPKISigningRequest} = proto;
const {serialize} = util;

export const webSignSignPendingRelease = onCall(
	async (data, namespace, getUsername) => {
		const {packageName, releaseID, signingRequest} = data;

		if (
			typeof packageName !== 'string' ||
			!packageName.includes('.') ||
			new URL(`https://${packageName}`).host !== packageName ||
			typeof releaseID !== 'string' ||
			signingRequest?.algorithm !== webSignAlgorithm ||
			!(signingRequest.data instanceof Uint8Array)
		) {
			throw new Error('Invalid arguments.');
		}

		const username = await getUsername();
		const userPendingReleasePath = `users/${username}/webSign/pendingReleases/${packageName}`;
		const signingRequestRef = database.ref(
			`${namespace}/webSign/pendingReleases/${releaseID}/signingRequests/${username}`
		);

		if (
			!(await hasItem(namespace, userPendingReleasePath)) ||
			(await signingRequestRef.once('value')).val() !== ''
		) {
			throw new Error('Pending release not found.');
		}

		await Promise.all([
			signingRequestRef.set(
				Buffer.from(
					await serialize(AGSEPKISigningRequest, signingRequest)
				).toString('base64')
			),
			removeItem(namespace, userPendingReleasePath)
		]);

		await webSignReleaseNotify(namespace, packageName, releaseID);
	}
);
