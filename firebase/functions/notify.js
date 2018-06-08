const sanitize		= require('sanitize-html');
const {sendMail}	= require('./email');
const {sendMessage}	= require('./messaging');
const {normalize}	= require('./util');


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

		if (!(await notifyMessage())) {
			await notifyMail();
		}
	}
});
