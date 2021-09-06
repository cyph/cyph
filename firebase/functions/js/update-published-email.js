import {util} from '@cyph/sdk';
import {database} from './init.js';

const {normalize} = util;

export const updatePublishedEmail = async (
	namespace,
	username,
	forceRemove = false
) => {
	username = normalize(username);

	const internalURL = `${namespace}/users/${username}/internal`;
	const emailVerifiedRef = database.ref(`${internalURL}/emailVerified`);
	const publicEmailsRef = database.ref(`${namespace}/publicEmailData/emails`);
	const publicUsernamesRef = database.ref(
		`${namespace}/publicEmailData/usernames`
	);

	const [email, oldPublicEmail] = await Promise.all([
		forceRemove ?
			undefined :
			emailVerifiedRef.once('value').then(o => o.val()),
		publicEmailsRef
			.child(username)
			.once('value')
			.then(o => o.val())
	]);

	const emailHex = email ? Buffer.from(email).toString('hex') : undefined;
	const oldPublicEmailHex = oldPublicEmail ?
		Buffer.from(oldPublicEmail).toString('hex') :
		undefined;

	if (!email) {
		await Promise.all([
			publicEmailsRef.child(username).remove(),
			publicUsernamesRef.child(emailHex).remove()
		]);

		return;
	}

	const oldPublicUsername = oldPublicEmail ?
		(await publicUsernamesRef.child(emailHex).once('value')).val() :
		undefined;

	if (oldPublicEmail === email && oldPublicUsername === username) {
		return email;
	}

	await Promise.all([
		publicEmailsRef.child(username).set(email),
		publicUsernamesRef.child(emailHex).set(username),
		oldPublicUsername && oldPublicUsername !== username ?
			publicEmailsRef.child(oldPublicUsername).remove() :
			undefined,
		oldPublicEmail && oldPublicEmail !== email ?
			publicUsernamesRef.child(oldPublicEmailHex).remove() :
			undefined
	]);

	return email;
};
