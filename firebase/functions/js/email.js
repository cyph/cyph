import {getMeta} from './modules/base.js';
const {__dirname} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import fs from 'fs/promises';
import {Emailer} from './modules/email/emailer.js';
import {namespaces} from './namespaces.js';

const {normalize} = util;

const emailer = new Emailer(
	JSON.parse(
		(await fs.readFile(`${__dirname}/email-credentials.json`)).toString()
	),
	namespaces
);

const getEmailAddress = async (database, namespace, username) => {
	let email, name;

	if (typeof username === 'object') {
		email = username.email;
		name = username.name;
	}
	else {
		const internalURL = `${namespace}/users/${normalize(
			username
		)}/internal`;

		[email, name] = (
			await Promise.all(
				['email', 'name'].map(async k =>
					database.ref(`${internalURL}/${k}`).once('value')
				)
			)
		).map(o => o.val() || undefined);
	}

	return {
		email,
		formatted: !email ? undefined : !name ? email : `${name} <${email}>`,
		name
	};
};

export const sendEmailInternal = async (...args) => emailer.sendEmail(...args);

/**
 * @param {{
 *     cancel: boolean;
 *     description: string;
 *     endTime: number;
 *     inviterUsername: string;
 *     location: string;
 *     recurrence: ICalendarRecurrenceRules;
 *     startTime: number;
 *     title: string;
 *     uid: string;
 *     url: string;
 * }} eventDetails
 * @param {(
 *     {data?: Record<string, string>; template: string}|
 *     {data?: Record<string, string>; templateName: string}|
 *     string
 * )} text
 */
export const sendEmail = async (
	database,
	namespace,
	username,
	subject,
	text,
	eventDetails,
	noUnsubscribe,
	attachments
) => {
	const to = await getEmailAddress(database, namespace, username);

	if (!to.formatted) {
		return;
	}

	const eventInviter =
		eventDetails && eventDetails.inviterUsername ?
			await getEmailAddress(
				database,
				namespace,
				eventDetails.inviterUsername
			) :
			undefined;

	await sendEmailInternal(
		to,
		subject,
		text,
		eventDetails,
		eventInviter,
		namespaces[namespace].accountsURL,
		noUnsubscribe,
		attachments
	);
};
