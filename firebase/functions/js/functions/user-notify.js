import {onCall} from '../base.js';
import {notifyUser} from '../notify-user.js';

export const userNotify = onCall(async (data, namespace, getUsername) => {
	if (!data || !data.target) {
		return;
	}

	const username = await getUsername();

	if (typeof data.target === 'string') {
		await notifyUser(data, namespace, username);
	}
	else if (data.target instanceof Array) {
		await Promise.all(
			data.target.map(async target =>
				notifyUser({...data, target}, namespace, username)
			)
		);
	}
});
