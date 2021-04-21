const cors = require('cors')({origin: true});
const functions = require('firebase-functions');
const functionBuilder = functions.runWith({
	memory: functions.config().project.id === 'cyphme' ? '1GB' : '256MB',
	timeoutSeconds: 60
});
const {database} = functionBuilder;
const {https} = functionBuilder.region(
	'asia-northeast1',
	'australia-southeast1',
	'europe-west1',
	'southamerica-east1',
	'us-central1'
);

const importFunction = async functionName =>
	import(`./js/functions/${functionName}.js`);

const onRequest = f =>
	https.onRequest((req, res) => cors(req, res, async () => f(req, res)));

exports.acceptPseudoRelationship = onRequest(async (...args) =>
	(await importFunction(
		'accept-pseudo-relationship'
	)).acceptPseudoRelationship(...args)
);

exports.appointmentInvite = onRequest(async (...args) =>
	(await importFunction('appointment-invite')).appointmentInvite(...args)
);

exports.burnerInvite = onRequest(async (...args) =>
	(await importFunction('burner-invite')).burnerInvite(...args)
);

/*
TODO: Re-enable after edge case false positives are fixed

exports.channelDisconnect = database
	.ref('/{namespace}/channels/{channel}/disconnects/{user}')
	.onWrite(async (...args) => (await importFunction('channel-disconnect')).channelDisconnect(...args));
*/

exports.checkInviteCode = onRequest(async (...args) =>
	(await importFunction('check-invite-code')).checkInviteCode(...args)
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

exports.getReactions = onRequest(async (...args) =>
	(await importFunction('get-reactions')).getReactions(...args)
);

exports.getSubscriptionData = onRequest(async (...args) =>
	(await importFunction('get-subscription-data')).getSubscriptionData(...args)
);

exports.getUserToken = onRequest(async (...args) =>
	(await importFunction('get-user-token')).getUserToken(...args)
);

exports.itemHashChange = database
	.ref('hash')
	.onUpdate(async (...args) =>
		(await importFunction('item-hash-change')).itemHashChange(...args)
	);

exports.itemRemoved = database
	.ref('hash')
	.onDelete(async (...args) =>
		(await importFunction('item-removed')).itemRemoved(...args)
	);

exports.openUserToken = onRequest(async (...args) =>
	(await importFunction('open-user-token')).openUserToken(...args)
);

exports.register = onRequest(async (...args) =>
	(await importFunction('register')).register(...args)
);

exports.rejectPseudoRelationship = onRequest(async (...args) =>
	(await importFunction(
		'reject-pseudo-relationship'
	)).rejectPseudoRelationship(...args)
);

exports.requestPseudoRelationship = onRequest(async (...args) =>
	(await importFunction(
		'request-pseudo-relationship'
	)).requestPseudoRelationship(...args)
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

exports.userDisconnect = database
	.ref('/{namespace}/users/{user}/clientConnections')
	.onDelete(async (...args) =>
		(await importFunction('user-disconnect')).userDisconnect(...args)
	);

exports.userEmailSet = database
	.ref('/{namespace}/users/{user}/email')
	.onWrite(async (...args) =>
		(await importFunction('user-email-set')).userEmailSet(...args)
	);

exports.userNotify = onRequest(async (...args) =>
	(await importFunction('user-notify')).userNotify(...args)
);

exports.userPublicProfileSet = database
	.ref('/{namespace}/users/{user}/publicProfile')
	.onWrite(async (...args) =>
		(await importFunction('user-public-profile-set')).userPublicProfileSet(
			...args
		)
	);

exports.userRegisterConfirmed = database
	.ref('/{namespace}/users/{user}/certificate')
	.onCreate(async (...args) =>
		(await importFunction('user-register-confirmed')).userRegisterConfirmed(
			...args
		)
	);

exports.usernameBlacklisted = onRequest(async (...args) =>
	(await importFunction('username-blacklisted')).usernameBlacklisted(...args)
);
