import {util} from '@cyph/sdk';
import {database, onCall} from '../init.js';

const {normalize} = util;

export const getEmailData = onCall(async (data, namespace, getUsername) => {
	let {email, username} = data;
	const publicEmailDataRef = database.ref(`${namespace}/publicEmailData`);

	username = username ? normalize(username) : undefined;

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
				.child(Buffer.from(email).toString('hex'))
				.once('value')
		).val();
	}

	return {email, username};
});
