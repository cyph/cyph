const admin			= require('firebase-admin');
const sanitize		= require('sanitize-html');
const {sendMail}	= require('./email');
const {sendMessage}	= require('./messaging');
const {normalize}	= require('./util');


const emailNotificationRateLimit	= 3600000;


module.exports	= (database, messaging) => ({
	notify: async (namespace, username, subject, text, eventDetails, preferPush) => {
		subject	= sanitize(subject);
		text	= sanitize(text);

		const notifyMail	= async () =>
			sendMail(database, namespace, username, subject, text, eventDetails)
		;

		const notifyMessage	= async () =>
			sendMessage(database, messaging, namespace, username, subject)
		;

		if (!preferPush || eventDetails) {
			await Promise.all([notifyMail(), notifyMessage()]);
			return;
		}

		if (await notifyMessage()) {
			return;
		}

		const lastPushEmail			=
			database.ref(`${namespace}/users/${normalize(username)}/internal/lastPushEmail`)
		;

		const lastPushEmailValue	= (await lastPushEmail.once('value')).val();

		if (
			!isNaN(lastPushEmailValue) &&
			(Date.now() - lastPushEmailValue) < emailNotificationRateLimit
		) {
			return;
		}

		await Promise.all([
			notifyMail(),
			lastPushEmail.set(admin.database.ServerValue.TIMESTAMP)
		]);
	}
});
