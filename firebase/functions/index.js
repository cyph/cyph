const functionsDatabase = require('firebase-functions/v2/database');
const functionsHTTPS = require('firebase-functions/v2/https');
const memoize = require('lodash/memoize.js');
const {functionsConfig} = require('./functions-config');

const defaultRegion = 'us-central1';
const regions = [
	/*
	'asia-northeast1',
	'australia-southeast1',
	'europe-west1',
	'southamerica-east1',
	*/
	'us-central1'
];

const getFunctionRuntimeOptions = (highMemory, region) => ({
	memory: functionsConfig.prod ?
		highMemory ?
			'4GiB' :
			'1GiB' :
	highMemory ?
		'4GiB' :
		'256MiB',
	// minInstances: functionsConfig.keepWarm && !highMemory ? 1 : undefined,
	region,
	timeoutSeconds: highMemory ? 540 : 60
});

const database = memoize(
	(ref, highMemory = false) => {
		const options = {
			...getFunctionRuntimeOptions(highMemory, defaultRegion),
			ref
		};

		return {
			onValueCreated: handler =>
				functionsDatabase.onValueCreated(options, handler),
			onValueDeleted: handler =>
				functionsDatabase.onValueDeleted(options, handler),
			onValueUpdated: handler =>
				functionsDatabase.onValueUpdated(options, handler),
			onValueWritten: handler =>
				functionsDatabase.onValueWritten(options, handler)
		};
	},
	(ref, highMemory) => (highMemory ? `HIGH_MEMORY: ${ref}` : ref)
);

const baseOnRequest =
	(highMemory = false) =>
	f =>
		functionsHTTPS.onRequest(
			{...getFunctionRuntimeOptions(highMemory, regions), cors: true},
			async (req, res) => f(req, res)
		);

const onRequest = baseOnRequest();
const onRequestHighMemory = baseOnRequest(true);

const importFunction = memoize(
	async functionName => import(`./js/functions/${functionName}.js`)
);

exports.acceptPseudoRelationship = onRequest(async (...args) =>
	(
		await importFunction('accept-pseudo-relationship')
	).acceptPseudoRelationship(...args)
);

exports.appointmentInvite = onRequest(async (...args) =>
	(await importFunction('appointment-invite')).appointmentInvite(...args)
);

exports.burnerInvite = onRequest(async (...args) =>
	(await importFunction('burner-invite')).burnerInvite(...args)
);

/*
TODO: Re-enable after edge case false positives are fixed

exports.channelDisconnect = database(
	'/{namespace}/channels/{channel}/disconnects/{user}'
).onValueWritten(async (...args) =>
	(await importFunction('channel-disconnect')).channelDisconnect(...args)
);
*/

exports.checkInviteCode = onRequest(async (...args) =>
	(await importFunction('check-invite-code')).checkInviteCode(...args)
);

exports.confirmMasterKey = onRequest(async (...args) =>
	(await importFunction('confirm-master-key')).confirmMasterKey(...args)
);

exports.downgradeAccount = onRequest(async (...args) =>
	(await importFunction('downgrade-account')).downgradeAccount(...args)
);

exports.generateInvite = onRequest(async (...args) =>
	(await importFunction('generate-invite')).generateInvite(...args)
);

exports.getCastleSessionID = onRequest(async (...args) =>
	(await importFunction('get-castle-session-id')).getCastleSessionID(...args)
);

exports.getEmailData = onRequest(async (...args) =>
	(await importFunction('get-email-data')).getEmailData(...args)
);

exports.getReactions = onRequest(async (...args) =>
	(await importFunction('get-reactions')).getReactions(...args)
);

exports.getSubscriptionData = onRequest(async (...args) =>
	(await importFunction('get-subscription-data')).getSubscriptionData(...args)
);

exports.getUserToken = onRequest(async (...args) =>
	(await importFunction('get-user-token')).getUserToken(...args)
);

exports.itemHashChange = database('hash').onValueUpdated(async (...args) =>
	(await importFunction('item-hash-change')).itemHashChange(...args)
);

exports.itemRemoved = database('hash').onValueDeleted(async (...args) =>
	(await importFunction('item-removed')).itemRemoved(...args)
);

exports.openUserToken = onRequest(async (...args) =>
	(await importFunction('open-user-token')).openUserToken(...args)
);

exports.publishEmail = onRequest(async (...args) =>
	(await importFunction('publish-email')).publishEmail(...args)
);

exports.register = onRequest(async (...args) =>
	(await importFunction('register')).register(...args)
);

exports.rejectPseudoRelationship = onRequest(async (...args) =>
	(
		await importFunction('reject-pseudo-relationship')
	).rejectPseudoRelationship(...args)
);

exports.requestPseudoRelationship = onRequest(async (...args) =>
	(
		await importFunction('request-pseudo-relationship')
	).requestPseudoRelationship(...args)
);

exports.resetCastleSessionID = onRequest(async (...args) =>
	(await importFunction('reset-castle-session-id')).resetCastleSessionID(
		...args
	)
);

exports.sendAppLink = onRequest(async (...args) =>
	(await importFunction('send-app-link')).sendAppLink(...args)
);

exports.sendInvite = onRequest(async (...args) =>
	(await importFunction('send-invite')).sendInvite(...args)
);

exports.setContact = onRequest(async (...args) =>
	(await importFunction('set-contact')).setContact(...args)
);

exports.updateKeyrings = onRequest(async (...args) =>
	(await importFunction('update-keyrings')).updateKeyrings(...args)
);

exports.userDisconnect = database(
	'/{namespace}/users/{user}/clientConnections'
).onValueDeleted(async (...args) =>
	(await importFunction('user-disconnect')).userDisconnect(...args)
);

exports.userEmailSet = database(
	'/{namespace}/users/{user}/email'
).onValueWritten(async (...args) =>
	(await importFunction('user-email-set')).userEmailSet(...args)
);

exports.userNotify = onRequest(async (...args) =>
	(await importFunction('user-notify')).userNotify(...args)
);

exports.userPublicProfileSet = database(
	'/{namespace}/users/{user}/publicProfile'
).onValueWritten(async (...args) =>
	(await importFunction('user-public-profile-set')).userPublicProfileSet(
		...args
	)
);

exports.userRegisterConfirmed = database(
	'/{namespace}/users/{user}/publicKeyCertificate'
).onValueCreated(async (...args) =>
	(await importFunction('user-register-confirmed')).userRegisterConfirmed(
		...args
	)
);

exports.usernameBlacklisted = onRequest(async (...args) =>
	(await importFunction('username-blacklisted')).usernameBlacklisted(...args)
);

exports.verifyEmail = onRequest(async (...args) =>
	(await importFunction('verify-email')).verifyEmail(...args)
);

exports.verifyEmailConfirm = onRequest(async (...args) =>
	(await importFunction('verify-email-confirm')).verifyEmailConfirm(...args)
);

exports.webSignSignPendingRelease = onRequest(async (...args) =>
	(
		await importFunction('websign-sign-pending-release')
	).webSignSignPendingRelease(...args)
);

exports.webSignSubmitRelease = onRequestHighMemory(async (...args) =>
	(await importFunction('websign-submit-release')).webSignSubmitRelease(
		...args
	)
);
