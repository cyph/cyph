import {removeItem} from '../init.js';

export const channelDisconnect = async ({after: data}, {params}) => {
	if (!data.exists()) {
		return;
	}

	const startingValue = data.val();

	await sleep(
		Math.max(channelDisconnectTimeout - (Date.now() - startingValue), 0)
	);

	if (startingValue !== (await data.ref.once('value')).val()) {
		return;
	}

	const doomedRef = data.ref.parent.parent;

	if (doomedRef.key.length < 1) {
		throw new Error('INVALID DOOMED REF');
	}

	return removeItem(params.namespace, `channels/${doomedRef.key}`);
};
