const cors = require('cors')({origin: true});
const {database, https} = require('firebase-functions');
const functions = import('./js/index.js');

const onRequest = f =>
	https.onRequest((req, res) => cors(req, res, async () => f(req, res)));

exports.acceptPseudoRelationship = onRequest(async (...args) =>
	(await functions).acceptPseudoRelationship(...args)
);

exports.appointmentInvite = onRequest(async (...args) =>
	(await functions).appointmentInvite(...args)
);

exports.burnerInvite = onRequest(async (...args) =>
	(await functions).burnerInvite(...args)
);

/*
TODO: Re-enable after edge case false positives are fixed

exports.channelDisconnect = database
	.ref('/{namespace}/channels/{channel}/disconnects/{user}')
	.onWrite(async (...args) => (await functions).channelDisconnect(...args));
*/

exports.checkInviteCode = onRequest(async (...args) =>
	(await functions).checkInviteCode(...args)
);

exports.downgradeAccount = onRequest(async (...args) =>
	(await functions).downgradeAccount(...args)
);

exports.generateInvite = onRequest(async (...args) =>
	(await functions).generateInvite(...args)
);

exports.getBraintreeSubscriptionID = onRequest(async (...args) =>
	(await functions).getBraintreeSubscriptionID(...args)
);

exports.getCastleSessionID = onRequest(async (...args) =>
	(await functions).getCastleSessionID(...args)
);

exports.getReactions = onRequest(async (...args) =>
	(await functions).getReactions(...args)
);

exports.getUserToken = onRequest(async (...args) =>
	(await functions).getUserToken(...args)
);

exports.itemHashChange = database
	.ref('hash')
	.onUpdate(async (...args) => (await functions).itemHashChange(...args));

exports.itemRemoved = database
	.ref('hash')
	.onDelete(async (...args) => (await functions).itemRemoved(...args));

exports.openUserToken = onRequest(async (...args) =>
	(await functions).openUserToken(...args)
);

exports.register = onRequest(async (...args) =>
	(await functions).register(...args)
);

exports.rejectPseudoRelationship = onRequest(async (...args) =>
	(await functions).rejectPseudoRelationship(...args)
);

exports.requestPseudoRelationship = onRequest(async (...args) =>
	(await functions).requestPseudoRelationship(...args)
);

exports.resetCastleSessionID = onRequest(async (...args) =>
	(await functions).resetCastleSessionID(...args)
);

exports.sendAppLink = onRequest(async (...args) =>
	(await functions).sendAppLink(...args)
);

exports.sendInvite = onRequest(async (...args) =>
	(await functions).sendInvite(...args)
);

exports.setContact = onRequest(async (...args) =>
	(await functions).setContact(...args)
);

exports.userDisconnect = database
	.ref('/{namespace}/users/{user}/clientConnections')
	.onDelete(async (...args) => (await functions).userDisconnect(...args));

exports.userEmailSet = database
	.ref('/{namespace}/users/{user}/email')
	.onWrite(async (...args) => (await functions).userEmailSet(...args));

exports.userNotify = onRequest(async (...args) =>
	(await functions).userNotify(...args)
);

exports.userPublicProfileSet = database
	.ref('/{namespace}/users/{user}/publicProfile')
	.onWrite(async (...args) =>
		(await functions).userPublicProfileSet(...args)
	);

exports.userRegisterConfirmed = database
	.ref('/{namespace}/users/{user}/certificate')
	.onCreate(async (...args) =>
		(await functions).userRegisterConfirmed(...args)
	);

exports.usernameBlacklisted = onRequest(async (...args) =>
	(await functions).usernameBlacklisted(...args)
);
