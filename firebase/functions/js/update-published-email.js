import {database} from './init.js';

export const updatePublishedEmail = async (
	namespace,
	username,
	forceRemove = false
) => {
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
			.then(o => o.val()),
		publicUsernamesRef
			.child(email)
			.once('value')
			.then(o => o.val())
	]);

	if (!email) {
		await Promise.all([
			publicEmailsRef.child(username).remove(),
			publicUsernamesRef.child(email).remove()
		]);

		return;
	}

	const oldPublicUsername = oldPublicEmail ?
		(await publicUsernamesRef.child(email).once('value')).val() :
		undefined;

	if (oldPublicEmail === email && oldPublicUsername === username) {
		return email;
	}

	await Promise.all([
		publicEmailsRef.child(username).set(email),
		publicUsernamesRef.child(email).set(username),
		oldPublicUsername && oldPublicUsername !== username ?
			publicEmailsRef.child(oldPublicUsername).remove() :
			undefined,
		oldPublicEmail && oldPublicEmail !== email ?
			publicUsernamesRef.child(oldPublicEmail).remove() :
			undefined
	]);

	return email;
};
