const sanitize		= require('sanitize-html');
const {sendMail}	= require('./email');
const {sendMessage}	= require('./messaging');
const {normalize}	= require('./util');


module.exports	= (database, messaging) => ({
	notify: async (namespace, username, subject, text, preferPush) => {
		const url	= `${namespace}/users/${normalize(username)}`;

		subject	= sanitize(subject);
		text	= sanitize(text);

		if (!preferPush) {
			await Promise.all([
				sendMail(database, namespace, url, subject, text),
				sendMessage(database, messaging, url, subject)
			]);
			return;
		}

		if (!(await sendMessage(database, messaging, url, text))) {
			await sendMail(database, namespace, url, subject, text);
		}
	}
});
