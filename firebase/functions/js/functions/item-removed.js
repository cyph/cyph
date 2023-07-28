import {getURL, removeItem} from '../init.js';

export const itemRemoved = async ({data, params}) => {
	if (data.exists()) {
		return;
	}

	return removeItem(
		params.namespace,
		getURL(data.adminRef, params.namespace)
	);
};
