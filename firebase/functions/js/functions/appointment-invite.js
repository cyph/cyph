import {configService as config} from '@cyph/sdk';
import {phoneNumberTimezone} from 'phone-number-timezone';
import {sendEmail} from '../email.js';
import {getBurnerLink} from '../get-burner-link.js';
import {database, getSMSCredentials, onCall} from '../init.js';
import {namespaces} from '../namespaces.js';
import {sendSMS} from '../sms.js';

export const appointmentInvite = onCall(
	async (data, namespace, getUsername) => {
		const {accountsURL} = namespaces[namespace];

		const accountBurnerID = (
			(data.eventDetails && (data.burnerUID || data.eventDetails.uid)) ||
			''
		).trim();

		if (!accountBurnerID) {
			throw new Error('Missing UID.');
		}

		const inviterUsername = await getUsername();
		const telehealth = !!data.telehealth;
		const uid = `${inviterUsername}-${accountBurnerID}`;
		const cancel = !!data.eventDetails.cancel;

		const members = ((data.to || {}).members || [])
			.map(o => ({
				email: (o.email || '').trim(),
				id: (o.id || '').trim(),
				name: (o.name || '').trim(),
				phoneNumber: (o.phoneNumber || '').trim()
			}))
			.filter(
				o =>
					o.id.length >= config.cyphIDLength &&
					(o.email || o.phoneNumber)
			);

		if (members.length < 1) {
			throw new Error('No recipients specified.');
		}

		const singleRecipient = members.length === 1 ? members[0] : undefined;

		const inviterLink = `${accountsURL}account-burner/${accountBurnerID}`;

		const startTimeString = timeZone => {
			if (!timeZone) {
				timeZone = data.inviterTimeZone || 'UTC';
			}

			try {
				return new Intl.DateTimeFormat('en-US', {
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
					month: 'long',
					timeZone,
					timeZoneName: 'long',
					year: 'numeric'
				}).format(new Date(data.eventDetails.startTime));
			}
			catch (err) {
				if (timeZone !== 'UTC') {
					return startTimeString('UTC');
				}

				throw err;
			}
		};

		const messageStatusPrefix = cancel ? `CANCELLED:` : '';
		const messageStatusPrefixLineBreak = cancel ?
			`${messageStatusPrefix}\n\n` :
			'';
		const messageStatusPrefixSpace = cancel ?
			`${messageStatusPrefix} ` :
			'';

		const messagePart1 = `Cyph appointment with \${PARTY} is scheduled for ${Math.floor(
			(data.eventDetails.endTime - data.eventDetails.startTime) / 60000
		)} minutes at \${START_TIME}`;

		const messagePart2 = `At the scheduled time, join here: \${LINK}`;

		const messageAddendumEmail = `You may also add the attached invitation to your calendar.`;

		const memberListToShare = data.shareMemberList ?
			members
				.map(o =>
					!data.shareMemberContactInfo ?
						o.name :
					!o.name ?
						o.email || o.phoneNumber :
						`${o.name} <${o.email || o.phoneNumber}>`
				)
				.filter(s => s) :
			[];

		const messageAddendumMembers =
			memberListToShare.length > 0 ?
				`\n\nThe following parties are invited to join:\n\n${memberListToShare.join(
					'\n'
				)}` :
				'';

		const smsCredentials = members.find(o => o.phoneNumber) ?
			await getSMSCredentials(namespace, inviterUsername) :
			undefined;

		await Promise.all([
			sendEmail(
				database,
				namespace,
				inviterUsername,
				`${messageStatusPrefixSpace}Cyph Appointment${
					!singleRecipient ?
						'' :
						` with ${
							!singleRecipient.name ?
								singleRecipient.email ||
								singleRecipient.phoneNumber :
								`${
									singleRecipient.name
								} <${singleRecipient.email ||
									singleRecipient.phoneNumber}>`
						}`
				}`,
				`${messageStatusPrefixLineBreak}${messagePart1
					.replace(' with ${PARTY}', '')
					.replace(
						'${START_TIME}',
						startTimeString()
					)}.\n\n${messagePart2.replace(
					'${LINK}',
					inviterLink
				)}\n\n${messageAddendumEmail}${messageAddendumMembers}`,
				{
					attendees: members,
					cancel,
					endTime: data.eventDetails.endTime,
					recurrence: data.eventDetails.recurrence,
					startTime: data.eventDetails.startTime,
					title: data.eventDetails.title,
					uid,
					url: inviterLink
				}
			),
			Promise.all(
				members.map(async o => {
					const emailTo = {email: o.email, name: o.name};

					const inviteeLink = getBurnerLink(
						namespace,
						o.id,
						inviterUsername,
						data.callType,
						telehealth
					);

					const inviteeMessagePart1 = messagePart1
						.replace('${PARTY}', `@${inviterUsername}`)
						.replace(
							'${START_TIME}',
							startTimeString(
								o.phoneNumber ?
									await phoneNumberTimezone(o.phoneNumber) :
									undefined
							)
						);

					const inviteeMessagePart2 = messagePart2.replace(
						'${LINK}',
						inviteeLink
					);

					return Promise.all([
						o.email &&
							sendEmail(
								database,
								namespace,
								emailTo,
								`${messageStatusPrefixSpace}Cyph Appointment with @${inviterUsername}`,
								{
									markdown: `${messageStatusPrefixLineBreak}${inviteeMessagePart1}.\n\n${inviteeMessagePart2}\n\n${messageAddendumEmail}${messageAddendumMembers}`,
									noUnsubscribe: true
								},
								{
									attendees: members,
									cancel,
									description: inviteeLink,
									endTime: data.eventDetails.endTime,
									inviterUsername: emailTo,
									recurrence: data.eventDetails.recurrence,
									startTime: data.eventDetails.startTime,
									title: data.eventDetails.title,
									uid,
									url: inviteeLink
								}
							),
						o.phoneNumber &&
							sendSMS(
								o.phoneNumber,
								messageStatusPrefixSpace + inviteeMessagePart1,
								smsCredentials
							).then(async () =>
								sendSMS(
									o.phoneNumber,
									inviteeMessagePart2,
									smsCredentials
								)
							)
					]);
				})
			)
		]);
	}
);
