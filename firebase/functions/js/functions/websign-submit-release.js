import {proto, util} from '@cyph/sdk';
import {isProd} from '../cyph-admin-vars.js';
import {admin, database, getItem, onCall, setItem} from '../init.js';
import {getWebSignPermissions} from '../modules/websign-permissions.js';
import {publishSubresources} from '../modules/websign-subresources.js';
import {webSignAlgorithm} from '../websign-algorithm.js';
import {webSignReleaseNotify} from '../websign-release-notify.js';

const {
	AGSEPKISigningRequest,
	WebSignPackageSubresources,
	WebSignPendingRelease
} = proto;
const {deserialize, serialize, uuid} = util;

export const webSignSubmitRelease = onCall(
	async (data, namespace, getUsername) => {
		const {
			packageName,
			requiredUserSignatures = [],
			signingRequest,
			subresourcesData,
			timestamp
		} = data;

		if (
			typeof packageName !== 'string' ||
			!packageName.includes('.') ||
			new URL(`https://${packageName}`).host !== packageName ||
			!(requiredUserSignatures instanceof Array) ||
			signingRequest?.algorithm !== webSignAlgorithm ||
			!(signingRequest.data instanceof Uint8Array) ||
			isNaN(timestamp)
		) {
			throw new Error('Invalid arguments.');
		}

		const {subresources} = await deserialize(
			WebSignPackageSubresources,
			subresourcesData
		);

		const author = await getUsername();
		const webSignPermissions = await getWebSignPermissions({
			getItem,
			testSign: !isProd
		});

		if (!webSignPermissions.packages[packageName]?.users[author]) {
			throw new Error(
				`@${author} is not authorized to submit new release of ${packageName}.`
			);
		}

		await publishSubresources({
			packageName,
			subresources
		});

		const releaseID = uuid(true);

		await database
			.ref(`${namespace}/webSign/pendingReleases/${releaseID}`)
			.set({
				packageName,
				signingRequests: Object.fromEntries([
					[
						author,
						Buffer.from(
							await serialize(
								AGSEPKISigningRequest,
								signingRequest
							)
						).toString('base64')
					],
					...requiredUserSignatures.map(username => [username, ''])
				]),
				timestamp: admin.database.ServerValue.TIMESTAMP
			});

		await Promise.all(
			requiredUserSignatures.map(async username =>
				setItem(
					namespace,
					`users/${username}/webSign/pendingReleases/${packageName}`,
					WebSignPendingRelease,
					{
						author,
						packageName,
						releaseID,
						signingRequest,
						timestamp
					}
				)
			)
		);

		await Promise.all(
			requiredUserSignatures.map(async username =>
				notify(
					namespace,
					username,
					`[WebSign] Please Sign New Release of ${packageName}`,
					{
						data: {author, packageName},
						templateName: 'websign-pending-release'
					}
				)
			)
		);

		await webSignReleaseNotify(namespace, packageName, releaseID);
	}
);
