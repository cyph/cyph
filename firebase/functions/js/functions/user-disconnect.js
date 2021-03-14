import {removeItem} from '../base.js';

export const userDisconnect = async (data, {params}) => {
	const username = params.user;

	return removeItem(params.namespace, `users/${username}/presence`);
};
