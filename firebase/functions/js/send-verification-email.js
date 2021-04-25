import {database, getTokenKey, notify, setItem} from './init.js';
import * as tokens from './tokens.js';

export const sendVerificationEmail = async (namespace, username) => {
	const userURL = `${namespace}/users/${username}`;
	const internalURL = `${userURL}/internal`;
	const emailRef = database.ref(`${internalURL}/email`);
	const emailVerifiedRef = database.ref(`${internalURL}/emailVerified`);
	const nameRef = database.ref(`${internalURL}/name`);
	const realUsernameRef = database.ref(`${internalURL}/realUsername`);

	let [email, emailVerified, name, realUsername] = await Promise.all([
		emailRef.once('value').then(o => o.val()),
		emailVerifiedRef.once('value').then(o => o.val()),
		nameRef.once('value').then(o => o.val()),
		realUsernameRef.once('value').then(o => o.val() || username)
	]);

	if (email && email !== email.trim().toLowerCase()) {
		email = email.trim().toLowerCase();

		await Promise.all([
			emailRef.set(email),
			setItem(namespace, `users/${username}/email`, StringProto, email)
		]);
	}

	if (!email || email === emailVerified) {
		return;
	}

	const {token} = await tokens.create(
		{
			emailVerification: {
				email,
				username
			}
		},
		await getTokenKey(namespace),
		/* Link expires after a month */
		2592000000
	);

	await notify(
		namespace,
		{email, name},
		'Verify your email for Cyph',
		{
			data: {
				email,
				token,
				username: realUsername
			},
			templateName: 'email-verification'
		},
		undefined,
		undefined,
		undefined,
		true,
		true
	);
};
