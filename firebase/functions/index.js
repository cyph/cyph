const cors = require('cors')({origin: true});
const functions = require('firebase-functions');
const memoize = require('lodash/memoize.js');

const {cyph: config} = functions.config();

const functionBuilder = (highMemory = false) =>
	functions.runWith({
		memory: config.prod ?
			highMemory ?
				'4GB' :
				'1GB' :
		highMemory ?
			'4GB' :
			'256MB',
		minInstances: config.keepwarm ? 1 : undefined,
		timeoutSeconds: highMemory ? 540 : 60
	});

const database = memoize(highMemory => functionBuilder(highMemory).database);
const https = memoize(
	highMemory =>
		functionBuilder(highMemory).region(
			'asia-northeast1',
			'australia-southeast1',
			'europe-west1',
			'southamerica-east1',
			'us-central1'
		).https
);

const importFunction = memoize(async functionName =>
	import(`./js/functions/${functionName}.js`)
);

const baseOnRequest = getHTTPS => f =>
	getHTTPS().onRequest(async (req, res) =>
		cors(req, res, async () => f(req, res))
	);

const onRequest = baseOnRequest(https);
const onRequestHighMemory = baseOnRequest(() => https(true));

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

exports.channelDisconnect = database()
	.ref('/{namespace}/channels/{channel}/disconnects/{user}')
	.onWrite(async (...args) => (await importFunction('channel-disconnect')).channelDisconnect(...args));
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

exports.itemHashChange = database()
	.ref('hash')
	.onUpdate(async (...args) =>
		(await importFunction('item-hash-change')).itemHashChange(...args)
	);

exports.itemRemoved = database()
	.ref('hash')
	.onDelete(async (...args) =>
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

exports.userDisconnect = database()
	.ref('/{namespace}/users/{user}/clientConnections')
	.onDelete(async (...args) =>
		(await importFunction('user-disconnect')).userDisconnect(...args)
	);

exports.userEmailSet = database()
	.ref('/{namespace}/users/{user}/email')
	.onWrite(async (...args) =>
		(await importFunction('user-email-set')).userEmailSet(...args)
	);

exports.userNotify = onRequest(async (...args) =>
	(await importFunction('user-notify')).userNotify(...args)
);

exports.userPublicProfileSet = database()
	.ref('/{namespace}/users/{user}/publicProfile')
	.onWrite(async (...args) =>
		(await importFunction('user-public-profile-set')).userPublicProfileSet(
			...args
		)
	);

exports.userRegisterConfirmed = database()
	.ref('/{namespace}/users/{user}/publicKeyCertificate')
	.onCreate(async (...args) =>
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
