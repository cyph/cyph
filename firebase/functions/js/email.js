import {proto, util} from '@cyph/sdk';
import fs from 'fs';
import ical from 'ical-generator';
import mustache from 'mustache';
import nodemailer from 'nodemailer';
import {getMeta} from './base.js';
import {dompurifyHtmlSanitizer} from './dompurify-html-sanitizer.js';
import {from, transport, transportBackup} from './email-credentials.js';
import {render, renderMarkdown, renderTemplate} from './markdown-templating.js';
import {namespaces} from './namespaces.js';

const {__dirname} = getMeta(import.meta);
const {CalendarInvite, CalendarRecurrenceRules} = proto;
const {normalize} = util;

const transporter = nodemailer.createTransport({
	...transport,
	pool: true,
	secure: true
});

const transporterBackup = nodemailer.createTransport({
	...transportBackup,
	pool: true,
	secure: true
});

const template = new Promise((resolve, reject) => {
	fs.readFile(__dirname + '/email.html', (err, data) => {
		if (err) {
			reject(err);
		}
		else {
			resolve(data.toString());
		}
	});
});

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

const recurrenceDayToString = dayOfWeek =>
	CalendarInvite.DaysOfWeek[dayOfWeek].toUpperCase().slice(0, 2);

const recurrenceFrequencyToString = frequency =>
	CalendarRecurrenceRules.Frequency[frequency].toUpperCase();

export const sendEmailInternal = async (
	to,
	subject,
	text,
	eventDetails,
	eventInviter,
	accountsURL,
	noUnsubscribe
) => {
	const markdown = (typeof text === 'object' ? text.markdown : text) || '';

	if (typeof text === 'object') {
		noUnsubscribe = noUnsubscribe || text.noUnsubscribe;

		if (!accountsURL && text.namespace) {
			accountsURL = namespaces[text.namespace].accountsURL;
		}

		const data = {
			...(typeof text.data === 'object' ? text.data : {}),
			accountsURL,
			accountsURLShort: accountsURL.split('://')[1]
		};

		text = text.template ?
			render(text.template, data) :
		text.templateName ?
			await renderTemplate(text.templateName, data) :
		!text.textOnly ?
			{html: renderMarkdown(markdown)} :
			undefined;
	}

	const cancelEvent = !!(
		eventDetails &&
		eventDetails.cancel &&
		eventDetails.uid
	);

	const fromFormatted = `Cyph <${from}>`;

	const eventDescription = !eventDetails ?
		'' :
		[
			...(eventDetails.title ? [subject] : []),
			...(eventDetails.description ?
				[eventDetails.description] :
				eventDetails.url ?
				[eventDetails.url] :
				[])
		].join('\n\n');

	const mailObject = !to ?
		undefined :
		{
			bcc: from,
			from: fromFormatted,
			html:
				!text || !accountsURL ?
					undefined :
					dompurifyHtmlSanitizer.sanitize(
						mustache.render(await template, {
							accountsURL,
							accountsURLShort: accountsURL.split('://')[1],
							noUnsubscribe,
							...(typeof text === 'object' ?
								{html: text.html} :
								{lines: text.split('\n')})
						})
					),
			icalEvent: !eventDetails ?
					undefined :
					{
						content: ical({
								domain: 'cyph.com',
								events: [{
										attendees: Object.values(
											[
												to,
												...(eventInviter ?
													[eventInviter] :
													[]),
												...(eventDetails.attendees ||
													[])
											].reduce(
												(attendees, o) => ({
													[typeof o === 'string' ?
														o :
														o.email]: o,
													...attendees
												}),
												{}
											)
										).filter(o => o.email),
										...(eventDescription ?
											{description: eventDescription} :
											{}),
										end: new Date(eventDetails.endTime),
										...(eventDetails.location ?
											{location: eventDetails.location} :
											{}),
										organizer: fromFormatted,
										...(eventDetails.recurrence ?
											{repeating: {
													...(eventDetails.recurrence
														.byWeekDay &&
													eventDetails.recurrence
														.byWeekDay.length > 0 ?
														{
															byDay: eventDetails.recurrence.byWeekDay.map(
																recurrenceDayToString
															)
														} :
														{}),
													...(eventDetails.recurrence
														.byMonth ?
														{
															byMonth:
																eventDetails
																	.recurrence
																	.byMonth
														} :
														{}),
													...(eventDetails.recurrence
														.byMonthDay ?
														{
															byMonthDay:
																eventDetails
																	.recurrence
																	.byMonthDay
														} :
														{}),
													...(eventDetails.recurrence
														.bySetPosition ?
														{
															bySetPos:
																eventDetails
																	.recurrence
																	.bySetPosition
														} :
														{}),
													...(eventDetails.recurrence
														.count ?
														{
															count: eventDetails
																.recurrence
																.count
														} :
														{}),
													...(eventDetails.recurrence
														.excludeDates &&
													eventDetails.recurrence
														.excludeDates.length >
														0 ?
														{
															exclude:
																eventDetails.recurrence.excludeDates.map(
																	timestamp =>
																		new Date(
																			timestamp
																		)
																)
														} :
														{}),
													...(eventDetails.recurrence
														.excludeDatesTimeZone ?
														{
															excludeTimezone:
																eventDetails
																	.recurrence
																	.excludeDatesTimeZone
														} :
														{}),
													freq: recurrenceFrequencyToString(
														eventDetails.recurrence
															.frequency
													),
													...(eventDetails.recurrence
														.interval ?
														{
															interval:
																eventDetails
																	.recurrence
																	.interval
														} :
														{}),
													...(eventDetails.recurrence
														.until ?
														{
															until: new Date(
																eventDetails.recurrence.until
															)
														} :
														{}),
													...(eventDetails.recurrence
														.weekStart ?
														{
															wkst: recurrenceDayToString(
																eventDetails
																	.recurrence
																	.weekStart
															)
														} :
														{})
												}} :
											{}),
										sequence: Math.floor(Date.now() / 1000),
										start: new Date(eventDetails.startTime),
										status: cancelEvent ?
											'cancelled' :
											'confirmed',
										summary: eventDetails.title || subject,
										...(eventDetails.uid ?
											{uid: eventDetails.uid} :
											{}),
										...(eventDetails.url ?
											{url: eventDetails.url} :
											{})
									}],
								method: cancelEvent ? 'CANCEL' : 'REQUEST',
								prodId: '//cyph.com//cyph-appointment-scheduler//EN'
							})
								.toString()
								.replace(
									/RRULE:(.*)/,
									(_, rrule) =>
										`RRULE:${rrule
											.split(';')
											.filter(s => !s.endsWith('='))
											.join(';')}`
								),
						filename: 'invite.ics',
						method: cancelEvent ? 'cancel' : 'request'
					},
			subject,
			text: markdown,
			to: typeof to === 'string' ? to : to.formatted
		};

	if (mailObject) {
		try {
			await transporter.sendMail(mailObject);
		}
		catch (_) {
			await transporterBackup.sendMail(mailObject);
		}
	}

	return markdown;
};

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
	noUnsubscribe
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
		noUnsubscribe
	);
};
