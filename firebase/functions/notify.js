const sanitize		= require('sanitize-html');
const {sendMail}	= require('./email');
const {sendMessage}	= require('./messaging');


module.exports	= (database, messaging) => ({
	notify: async (namespace, username, subject, text) => {
		const url	= `${namespace}/users/${username}`;

		subject	= sanitize(subject);
		text	= sanitize(text);

		await Promise.all([
			sendMail(database, url, subject, text),
			sendMessage(database, messaging, url, subject)
		]);
	}
});
