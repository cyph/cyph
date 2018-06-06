const sanitize		= require('sanitize-html');
const {sendMail}	= require('./email');
const {sendMessage}	= require('./messaging');
const {normalize}	= require('./util');


module.exports	= (database, messaging) => ({
	notify: async (namespace, username, subject, text, preferPush) => {
		subject	= sanitize(subject);
		text	= sanitize(text);

		if (!preferPush) {
			await Promise.all([
				sendMail(database, namespace, username, subject, text),
				sendMessage(database, messaging, username, subject)
			]);
			return;
		}

		if (!(await sendMessage(database, messaging, username, subject))) {
			await sendMail(database, namespace, username, subject, text);
		}
	}
});
