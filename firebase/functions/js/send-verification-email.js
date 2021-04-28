import {database, getTokenKey, notify, removeItem, setItem} from './init.js';
import * as tokens from './tokens.js';
import {validateEmail} from './validation.js';

export const sendVerificationEmail = async (namespace, username, newEmail) => {
	const userURL = `${namespace}/users/${username}`;
	const internalURL = `${userURL}/internal`;
	const emailRef = database.ref(`${internalURL}/email`);
	const emailVerifiedRef = database.ref(`${internalURL}/emailVerified`);
	const nameRef = database.ref(`${internalURL}/name`);
	const realUsernameRef = database.ref(`${internalURL}/realUsername`);

	const [emailRaw, emailVerified, name, realUsername] = await Promise.all([
		emailRef.once('value').then(o => o.val()),
		emailVerifiedRef.once('value').then(o => o.val()),
		nameRef.once('value').then(o => o.val()),
		realUsernameRef.once('value').then(o => o.val() || username)
	]);

	const email =
		validateEmail(newEmail, true) || validateEmail(emailRaw, true);

	if (email !== emailRaw) {
		if (email) {
			await Promise.all([
				emailRef.set(email),
				setItem(
					namespace,
					`users/${username}/email`,
					StringProto,
					email
				)
			]);
		}
		else {
			await Promise.all([
				emailRef.remove(),
				removeItem(namespace, `users/${username}/email`)
			]);
		}
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
