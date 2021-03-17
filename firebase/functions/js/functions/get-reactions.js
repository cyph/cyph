import {util} from '@cyph/sdk';
import {database, onCall} from '../init.js';
import {validateInput} from '../validation.js';

const {normalize} = util;

export const getReactions = onCall(async (data, namespace, getUsername) => {
	const currentUser = await getUsername();
	const username = normalize(data.username);
	const id = validateInput(data.id);
	const isComment = data.isComment === true;

	if (!username || !id) {
		return {};
	}

	const parent = isComment ? 'postCommentReactions' : 'postReactions';

	const reactionsRef = database.ref(
		`${namespace}/users/${username}/${parent}/${id}`
	);

	const reactions = (await reactionsRef.once('value')).val() || {};

	return Object.entries(reactions)
		.map(([k, v]) => [
			k,
			{
				count: Object.keys(v).length,
				selected: currentUser in v
			}
		])
		.reduce((o, [k, v]) => ({...o, [k]: v}), {});
});
