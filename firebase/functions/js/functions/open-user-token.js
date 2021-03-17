import {getTokenKey, onRequest} from '../init.js';
import * as tokens from '../tokens.js';
import {validateInput} from '../validation.js';

export const openUserToken = onRequest(true, async (req, res, namespace) => {
	const userToken = validateInput(req.body.userToken);

	return tokens.open(userToken, await getTokenKey(namespace));
});
