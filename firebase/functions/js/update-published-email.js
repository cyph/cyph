import {proto, util} from '@cyph/sdk';
import {database, setItem} from './init.js';

const {NumberProto} = proto;
const {normalize} = util;

export const updatePublishedEmail = async (
	namespace,
	username,
	signature,
	forceRemove = false
) => {
	username = normalize(username);

	if (signature instanceof Uint8Array) {
		signature = Buffer.from(signature);
	}
	if (signature instanceof Buffer) {
		signature = signature.toString('base64');
	}
	if (typeof signature !== 'string') {
		signature = undefined;
	}

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
			.child('email')
			.once('value')
			.then(o => o.val())
	]);

	const emailHex = email ? Buffer.from(email).toString('hex') : undefined;
	const oldPublicEmailHex = oldPublicEmail ?
		Buffer.from(oldPublicEmail).toString('hex') :
		undefined;

	const updateTimestamp = async () =>
		setItem(
			namespace,
			`users/${username}/emailPublishUpdateTimestamp`,
			NumberProto,
			Date.now()
		);

	if (!email || !signature) {
		await Promise.all([
			publicEmailsRef.child(username).remove(),
			email ? publicUsernamesRef.child(emailHex).remove() : undefined,
			oldPublicEmail && oldPublicEmail !== email ?
				publicUsernamesRef.child(oldPublicEmailHex).remove() :
				undefined
		]);

		await updateTimestamp();

		return;
	}

	const oldPublicUsername = oldPublicEmail ?
		(await publicUsernamesRef.child(emailHex).once('value')).val() :
		undefined;

	if (oldPublicEmail === email && oldPublicUsername === username) {
		return email;
	}

	await Promise.all([
		publicEmailsRef.child(username).set({email, signature}),
		publicUsernamesRef.child(emailHex).set(username),
		oldPublicUsername && oldPublicUsername !== username ?
			publicEmailsRef.child(oldPublicUsername).remove() :
			undefined,
		oldPublicEmail && oldPublicEmail !== email ?
			publicUsernamesRef.child(oldPublicEmailHex).remove() :
			undefined
	]);

	await updateTimestamp();

	return email;
};
