import {util} from '@cyph/sdk';
import {database, onCall} from '../init.js';

const {normalize} = util;

export const getEmailData = onCall(async (data, namespace, getUsername) => {
	let {email, username} = data;
	const publicEmailDataRef = database.ref(`${namespace}/publicEmailData`);

	username = username ? normalize(username) : undefined;

	let signature;

	if (username) {
		const o = (
			await publicEmailDataRef
				.child('emails')
				.child(username)
				.once('value')
		).val();

		if (
			typeof o === 'object' &&
			o &&
			typeof o.email === 'string' &&
			typeof o.signature === 'string'
		) {
			email = o.email;
			signature = Buffer.from(o.signature, 'base64');
		}
	}
	else if (email) {
		username = (
			await publicEmailDataRef
				.child('usernames')
				.child(Buffer.from(email).toString('hex'))
				.once('value')
		).val();
	}

	return {email, signature, username};
});
