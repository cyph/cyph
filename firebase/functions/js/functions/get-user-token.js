import {getTokenKey, onCall} from '../base.js';
import tokens from '../tokens.js';

export const getUserToken = onCall(async (data, namespace, getUsername) => {
	const [tokenKey, username] = await Promise.all([
		getTokenKey(namespace),
		getUsername()
	]);

	if (!username) {
		throw new Error('User not authenticated.');
	}

	return tokens.create({username}, tokenKey);
});
