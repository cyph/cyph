import {proto, util} from '@cyph/sdk';
import {isProd} from '../cyph-admin-vars.js';
import {admin, database, getItem, onCall, setItem} from '../init.js';
import {getWebSignPermissions} from '../modules/websign-permissions.js';
import {publishSubresources} from '../modules/websign-subresources.js';
import {webSignAlgorithm} from '../websign-algorithm.js';
import {webSignReleaseNotify} from '../websign-release-notify.js';

const {
	AGSEPKISigningRequest,
	PotassiumData,
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
			new URL(`https://${packageName}`).host !== packageName
		) {
			throw new Error(`Invalid \`packageName\`: ${packageName}.`);
		}
		if (!(requiredUserSignatures instanceof Array)) {
			throw new Error(`Missing \`requiredUserSignatures\`.`);
		}
		if (signingRequest?.algorithm !== webSignAlgorithm) {
			throw new Error(
				`Invalid \`signingRequest.algorithm\`: ${
					signingRequest?.algorithm !== undefined ?
						`PotassiumData.SignAlgorithms.${
							PotassiumData.SignAlgorithms[
								signingRequest.algorithm
							] ?? '(none)'
						} (${signingRequest.algorithm.toString()})` :
						'undefined'
				}. Expected: PotassiumData.SignAlgorithms.${
					PotassiumData.SignAlgorithms[webSignAlgorithm]
				}.`
			);
		}
		if (!(signingRequest.data instanceof Uint8Array)) {
			throw new Error(`Missing \`signingRequest.data\`.`);
		}
		if (isNaN(timestamp)) {
			throw new Error(
				`Invalid \`timestamp\`: ${
					timestamp !== undefined ? timestamp.toString() : 'undefined'
				}.`
			);
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
