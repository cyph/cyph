import {proto} from '@cyph/sdk';
import {database, getTokenKey, onCall, removeItem, setItem} from '../init.js';
import * as tokens from '../tokens.js';

const {StringProto} = proto;

export const verifyEmailConfirm = onCall(
	async (data, namespace, getUsername) => {
		const approve = !!data.approve;
		const token = data.token;

		const [authUsername, {emailVerification}] = await Promise.all([
			getUsername(),
			(async () =>
				tokens.open(
					token,
					await getTokenKey(namespace)
				))().catch(() => ({}))
		]);

		const {username} = emailVerification || {};

		if (!username || (approve && username !== authUsername)) {
			return false;
		}

		const userURL = `${namespace}/users/${username}`;
		const internalURL = `${userURL}/internal`;
		const emailRef = database.ref(`${internalURL}/email`);
		const emailVerifiedRef = database.ref(`${internalURL}/emailVerified`);

		const [email, emailVerified] = await Promise.all([
			emailRef.once('value').then(o => o.val()),
			emailVerifiedRef.once('value').then(o => o.val())
		]);

		if (emailVerification.email !== email) {
			return false;
		}

		if (!approve) {
			await Promise.all([
				emailRef.remove(),
				emailVerifiedRef.remove(),
				removeItem(namespace, `users/${username}/email`),
				removeItem(namespace, `users/${username}/emailVerified`)
			]);
		}
		else if (email !== emailVerified) {
			await Promise.all([
				emailVerifiedRef.set(email),
				setItem(
					namespace,
					`users/${username}/emailVerified`,
					StringProto,
					email
				)
			]);
		}

		return true;
	}
);
