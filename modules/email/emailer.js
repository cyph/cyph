import {getMeta} from '../base.js';
const {__dirname} = getMeta(import.meta);

import {proto} from '@cyph/sdk';
import fs from 'fs/promises';
import ical from 'ical-generator';
import moment from 'moment-timezone';
import mustache from 'mustache';
import nodemailer from 'nodemailer';
import icalTimezones from '@touch4it/ical-timezones';
import {dompurifyHtmlSanitizer} from '../dompurify-html-sanitizer.js';
import {render, renderMarkdown, renderTemplate} from './markdown-templating.js';

const {CalendarInvite, CalendarRecurrenceRules} = proto;

export class Emailer {
	createEvent (o)  {
		const cal = ical(o.calendarData);
		o.calendarData = undefined;
		cal.createEvent(o);
		return cal.toString();
	}

	/** Workaround for odd behavior of @touch4it/ical-timezones. */
	getDate (timestamp, timeZone)  {
		return new Date(
			timestamp + (timeZone ? moment.tz(timeZone).utcOffset() * 60000 : 0)
		);
	}

	recurrenceDayToString (dayOfWeek)  {
		return CalendarInvite.DaysOfWeek[dayOfWeek].toUpperCase().slice(0, 2);
	}

	recurrenceFrequencyToString (frequency)  {
		return CalendarRecurrenceRules.Frequency[frequency].toUpperCase();
	}

	async sendEmail (
		to,
		subject,
		text,
		eventDetails,
		eventInviter,
		accountsURL,
		noUnsubscribe,
		attachments = []
	)  {
		const markdown =
			(typeof text === 'object' ? text.markdown : text) || '';

		if (typeof text === 'object') {
			noUnsubscribe = noUnsubscribe || text.noUnsubscribe;

			if (!accountsURL && text.namespace) {
				accountsURL = this.namespaces[text.namespace].accountsURL;
			}

			const data = {
				...(typeof text.data === 'object' ? text.data : {}),
				accountsURL,
				accountsURLShort: accountsURL.split('://')[1]
			};

			text = text.text ?
				text.text :
			text.template ?
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

		const fromFormatted = `Cyph <${this.credentials.from}>`;

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
				attachments,
				bcc: this.credentials.from,
				from: fromFormatted,
				html:
					!text || !accountsURL ?
						undefined :
						dompurifyHtmlSanitizer.sanitize(
							mustache.render(await this.template, {
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
							content: this.createEvent({
									attendees: Object.values(
										[
											to,
											...(eventInviter ?
												[eventInviter] :
												[]),
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
									calendarData: {
										method: cancelEvent ?
											'CANCEL' :
											'REQUEST',
										prodId: '//cyph.com//cyph-appointment-scheduler//EN',
										timezone: {
											generator:
												icalTimezones.getVtimezoneComponent,
											name: 'Cyph Calendar'
										}
									},
									...(eventDescription ?
										{description: eventDescription} :
										{}),
									end: this.getDate(
										eventDetails.endTime,
										eventDetails.timeZone
									),
									...(eventDetails.location ?
										{location: eventDetails.location} :
										{}),
									organizer: fromFormatted,
									...(eventDetails.recurrence ? {repeating: {
												...(eventDetails.recurrence
													.byWeekDay instanceof
													Array &&
												eventDetails.recurrence
													.byWeekDay.length > 0 ?
													{
														byDay: eventDetails.recurrence.byWeekDay.map(
															s =>
																this.recurrenceDayToString(
																	s
																)
														)
													} :
													{}),
												...(eventDetails.recurrence
													.byMonth instanceof Array &&
												eventDetails.recurrence.byMonth
													.length > 0 ?
													{
														byMonth:
															eventDetails
																.recurrence
																.byMonth
													} :
													{}),
												...(eventDetails.recurrence
													.byMonthDay instanceof
													Array &&
												eventDetails.recurrence
													.byMonthDay.length > 0 ?
													{
														byMonthDay:
															eventDetails
																.recurrence
																.byMonthDay
													} :
													{}),
												...(eventDetails.recurrence
													.bySetPosition instanceof
													Array &&
												eventDetails.recurrence
													.bySetPosition.length > 0 ?
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
															.recurrence.count
													} :
													{}),
												...(eventDetails.recurrence
													.excludeDates instanceof
													Array &&
												eventDetails.recurrence
													.excludeDates.length > 0 ?
													{
														exclude:
															eventDetails.recurrence.excludeDates.map(
																timestamp =>
																	this.getDate(
																		timestamp,
																		eventDetails.timeZone
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
												freq: this.recurrenceFrequencyToString(
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
														until: this.getDate(
															eventDetails
																.recurrence
																.until,
															eventDetails.timeZone
														)
													} :
													{}),
												...(eventDetails.recurrence
													.weekStart ?
													{
														wkst: this.recurrenceDayToString(
															eventDetails
																.recurrence
																.weekStart
														)
													} :
													{})
											}} : {}),
									sequence: Math.floor(Date.now() / 1000),
									start: this.getDate(
										eventDetails.startTime,
										eventDetails.timeZone
									),
									status: cancelEvent ?
										'cancelled' :
										'confirmed',
									timezone: eventDetails.timeZone || 'UTC',
									summary: eventDetails.title || subject,
									...(eventDetails.uid ?
										{uid: eventDetails.uid} :
										{}),
									...(eventDetails.url ?
										{url: eventDetails.url} :
										{})
								}).replace(
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
				await this.transporter.sendMail(mailObject);
			}
			catch (_) {
				await this.transporterBackup.sendMail(mailObject);
			}
		}

		return markdown;
	}

	constructor (
		credentials,
		namespaces = {},
		templatePath = `${__dirname}/email-template.html`
	) {
		this.credentials = credentials;
		this.namespaces = namespaces;
		this.templatePath = templatePath;

		if (
			!this.credentials?.from ||
			typeof this.credentials?.transport !== 'object' ||
			typeof this.credentials?.transportBackup !== 'object'
		) {
			throw new Error('No email credentials specfied.');
		}

		this.template = fs.readFile(this.templatePath).then(o => o.toString());

		this.transporter = nodemailer.createTransport({
			...this.credentials.transport,
			pool: true,
			secure: true
		});

		this.transporterBackup = nodemailer.createTransport({
			...this.credentials.transportBackup,
			pool: true,
			secure: true
		});
	}
}
