import {getTokenKey, onRequest, validateInput} from '../base.js';
import tokens from '../tokens.js';

export const openUserToken = onRequest(true, async (req, res, namespace) => {
	const userToken = validateInput(req.body.userToken);

	return tokens.open(userToken, await getTokenKey(namespace));
});
