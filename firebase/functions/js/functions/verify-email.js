import {onCall} from '../init.js';
import {sendVerificationEmail} from '../send-verification-email.js';

export const verifyEmail = onCall(async (data, namespace, getUsername) => {
	const username = await getUsername();

	if (!username) {
		throw new Error('User not authenticated.');
	}

	await sendVerificationEmail(namespace, username);
});
