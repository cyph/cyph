const {sendMail}	= require('./email');
const {sendMessage}	= require('./messaging');


module.exports	= (database, messaging) => ({
	notify: async (namespace, user, subject, text) => {
		const url	= `${namespace}/users/${user}`;

		await Promise.all([
			sendMail(database, url, subject, text),
			sendMessage(database, messaging, url, subject)
		]);
	}
});
