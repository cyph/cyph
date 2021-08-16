import {onCall} from '../init.js';
import {updatePublishedEmail} from '../update-published-email.js';

export const publishEmail = onCall(async (data, namespace, getUsername) =>
	updatePublishedEmail(
		namespace,
		await getUsername(),
		data.unpublish === true
	)
);
