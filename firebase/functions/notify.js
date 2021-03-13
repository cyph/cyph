import admin from 'firebase-admin';
import {dompurifyHtmlSanitizer} from './dompurify-html-sanitizer.js';
import {sendMail} from './email.js';
import {sendMessage} from './messaging.js';
import {normalize} from './util.js';

const emailNotificationRateLimit = 3600000;

export const initNotify = (database, messaging) => ({
	notify: async (
		namespace,
		username,
		subject,
		text,
		eventDetails,
		pushNotificationOptions,
		preferPush
	) => {
		subject = dompurifyHtmlSanitizer.sanitize(subject);
		text =
			typeof text === 'string' ?
				dompurifyHtmlSanitizer.sanitize(text) :
				text;

		const notifyMail = async () =>
			sendMail(
				database,
				namespace,
				username,
				subject,
				text,
				eventDetails
			);
		const notifyMessage = async () =>
			sendMessage(
				database,
				messaging,
				namespace,
				username,
				subject,
				pushNotificationOptions
			);
		if (!preferPush || eventDetails) {
			await Promise.all([notifyMail(), notifyMessage()]);
			return;
		}

		if (await notifyMessage()) {
			return;
		}

		const lastPushEmail = database.ref(
			`${namespace}/users/${normalize(username)}/internal/lastPushEmail`
		);
		const lastPushEmailValue = (await lastPushEmail.once('value')).val();

		if (
			!isNaN(lastPushEmailValue) &&
			Date.now() - lastPushEmailValue < emailNotificationRateLimit
		) {
			return;
		}

		await Promise.all([
			notifyMail(),
			lastPushEmail.set(admin.database.ServerValue.TIMESTAMP)
		]);
	}
});

export default initNotify;
