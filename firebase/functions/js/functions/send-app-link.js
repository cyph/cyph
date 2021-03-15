import {onCall} from '../init.js';
import {sendSMS} from '../sms.js';

export const sendAppLink = onCall(async (data, namespace, getUsername) => {
	const phoneNumber = (data.phoneNumber || '').trim();

	if (typeof phoneNumber !== 'string' || !phoneNumber) {
		return;
	}

	await sendSMS(
		phoneNumber,
		`Here's the link you requested to install Cyph! https://www.cyph.com/download-app`
	);
});
