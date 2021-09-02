import {database, onCall} from '../init.js';

export const getEmailData = onCall(async (data, namespace, getUsername) => {
	let {email, username} = data;
	const publicEmailDataRef = database.ref(`${namespace}/publicEmailData`);

	if (username) {
		email = (
			await publicEmailDataRef
				.child('emails')
				.child(username)
				.once('value')
		).val();
	}
	else if (email) {
		username = (
			await publicEmailDataRef
				.child('usernames')
				.child(email)
				.once('value')
		).val();
	}

	return {email, username};
});
