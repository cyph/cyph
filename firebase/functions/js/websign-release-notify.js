import {sendEmailInternal} from './email.js';
import {database, notify} from './init.js';

export const webSignReleaseNotify = async (
	namespace,
	packageName,
	releaseID
) => {
	const pendingReleaseRef = database.ref(
		`${namespace}/webSign/pendingReleases/${releaseID}`
	);

	const {signingRequests = {}} =
		(await pendingReleaseRef.once('value')).val() ?? {};
	const signingRequestUsers = Object.keys(signingRequests);
	const signingRequestValues = Object.values(signingRequests);

	if (signingRequestValues.length < 1 || signingRequestValues.includes('')) {
		return;
	}

	await Promise.all([
		sendEmailInternal(
			'websign-releases@cyph.com',
			`New WebSign Release: ${packageName}`,
			`Signed by:${
				signingRequestUsers.length === 1 ?
					` @${signingRequestUsers[0]}` :
					['', ...signingRequestUsers].join('\n\n* @')
			}`
		),
		...signingRequestUsers.map(async username =>
			notify(
				namespace,
				username,
				`[WebSign] New Release of ${packageName} Queued for Deployment`,
				{
					data: {packageName},
					templateName: 'websign-queued-release'
				}
			)
		)
	]);
};
