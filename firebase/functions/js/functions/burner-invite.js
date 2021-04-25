import {sendEmail} from '../email.js';
import {getBurnerLink} from '../get-burner-link.js';
import {database, getSMSCredentials, onCall} from '../init.js';
import {sendSMS} from '../sms.js';
import {validateEmail} from '../validation.js';

export const burnerInvite = onCall(async (data, namespace, getUsername) => {
	const {callType, id, name, phoneNumber, telehealth} = data;

	const email = validateEmail(data.email, true);
	const username =
		data.username && data.username === (await getUsername()) ?
			data.username :
			undefined;

	const url = getBurnerLink(namespace, id, username, callType, telehealth);

	const subject =
		'Cyph Meeting Invite' + (username ? ` from @${username}` : '');

	const messagePart1 = `${
		name ? `${name}, you've` : "You've"
	} been invited to an encrypted Cyph meeting!`;

	const messagePart2 = `Click here to join:`;

	const emailMessage = `${messagePart1}\n\n${messagePart2} [${url}](${url})`;
	const smsMessage = `${messagePart1} ${messagePart2} ${url}`;

	await Promise.all([
		email &&
			sendEmail(
				database,
				namespace,
				name ? {email, name} : email,
				subject,
				{
					markdown: emailMessage,
					noUnsubscribe: true
				}
			),
		phoneNumber &&
			sendSMS(
				phoneNumber,
				smsMessage,
				await getSMSCredentials(namespace, username)
			)
	]);
});
