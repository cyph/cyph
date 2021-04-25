import {util} from '@cyph/sdk';
import admin from 'firebase-admin';
import {dompurifyHtmlSanitizer} from './dompurify-html-sanitizer.js';
import {sendEmail} from './email.js';
import {sendMessage} from './messaging.js';

const {normalize} = util;

const emailNotificationRateLimit = 3600000;

export const initNotify = (database, messaging) => ({
	notify: async (
		namespace,
		username,
		subject,
		text,
		eventDetails,
		pushNotificationOptions,
		preferPush,
		emailOnly,
		noUnsubscribe
	) => {
		subject = dompurifyHtmlSanitizer.sanitize(subject);
		text =
			typeof text === 'string' ?
				dompurifyHtmlSanitizer.sanitize(text) :
				text;

		if (emailOnly) {
			preferPush = false;
		}

		const notifyMail = async () =>
			sendEmail(
				database,
				namespace,
				username,
				subject,
				text,
				eventDetails,
				noUnsubscribe
			);

		const notifyMessage = async () =>
			!emailOnly ?
				sendMessage(
					database,
					messaging,
					namespace,
					username,
					subject,
					pushNotificationOptions
				) :
				undefined;

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
