const fs = require('fs');
const ical = require('ical-generator');
const mustache = require('mustache');
const nodemailer = require('nodemailer');
const {dompurifyHtmlSanitizer} = require('./dompurify-html-sanitizer');
const {from, transport, transportBackup} = require('./email-credentials');
const {render, renderTemplate} = require('./markdown-templating');
const namespaces = require('./namespaces');
const {CalendarInvite, CalendarRecurrenceRules} = require('./proto');
const {normalize} = require('./util');

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

		[email, name] = (await Promise.all(
			['email', 'name'].map(async k =>
				database.ref(`${internalURL}/${k}`).once('value')
			)
		)).map(o => o.val() || undefined);
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

const sendMailInternal = async (
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
			undefined;
	}

	const cancelEvent = !!(
		eventDetails &&
		eventDetails.cancel &&
		eventDetails.uid
	);

	const fromFormatted = `Cyph <${from}>`;

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
										...(eventInviter ? [eventInviter] : []),
										...(eventDetails.attendees || [])
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
								description: eventDetails.description,
								end: new Date(eventDetails.endTime),
								location: eventDetails.location,
								organizer: eventInviter || fromFormatted,
								repeating: eventDetails.recurrence ? {
										byDay: (
											eventDetails.recurrence.byWeekDay ||
											[]
										).map(recurrenceDayToString),
										byMonth:
											eventDetails.recurrence.byMonth,
										byMonthDay:
											eventDetails.recurrence.byMonthDay,
										bySetPos:
											eventDetails.recurrence
												.bySetPosition,
										count: eventDetails.recurrence.count,
										exclude: (
											eventDetails.recurrence
												.excludeDates || []
										).map(timestamp => new Date(timestamp)),
										excludeTimezone:
											eventDetails.recurrence
												.excludeDatesTimeZone,
										freq: recurrenceFrequencyToString(
											eventDetails.recurrence.frequency
										),
										interval:
											eventDetails.recurrence.interval,
										until: eventDetails.recurrence.until ?
											new Date(
												eventDetails.recurrence.until
											) :
											undefined,
										wkst: eventDetails.recurrence
											.weekStart ?
											recurrenceDayToString(
												eventDetails.recurrence
													.weekStart
											) :
											undefined
									} : undefined,
								sequence: Math.floor(Date.now() / 1000),
								start: new Date(eventDetails.startTime),
								status: cancelEvent ? 'cancelled' : 'confirmed',
								summary: eventDetails.summary || subject,
								uid: eventDetails.uid,
								url: eventDetails.url
							}],
						method: cancelEvent ? 'cancel' : 'request',
						prodId: '//cyph.com//cyph-appointment-scheduler//EN'
					}).toString(),
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
 *     summary: string;
 *     uid: string;
 *     url: string;
 * }} eventDetails
 * @param {(
 *     {data?: Record<string, string>; template: string}|
 *     {data?: Record<string, string>; templateName: string}|
 *     string
 * )} text
 */
const sendMail = async (
	database,
	namespace,
	username,
	subject,
	text,
	eventDetails
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

	await sendMailInternal(
		to,
		subject,
		text,
		eventDetails,
		eventInviter,
		namespaces[namespace].accountsURL
	);
};

module.exports = {sendMail, sendMailInternal};
