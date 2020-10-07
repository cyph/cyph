const fs = require('fs');
const ical = require('ical-generator');
const mustache = require('mustache');
const nodemailer = require('nodemailer');
const {dompurifyHtmlSanitizer} = require('./dompurify-html-sanitizer');
const {from, transport, transportBackup} = require('./email-credentials');
const {render, renderTemplate} = require('./markdown-templating');
const namespaces = require('./namespaces');
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

	const mailObject = !to ?
		undefined :
		{
			bcc: from,
			from: `Cyph <${from}>`,
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
								organizer: eventInviter || from,
								start: new Date(eventDetails.startTime),
								status: 'confirmed',
								summary: eventDetails.summary || subject
							}],
						method: 'request',
						prodId: '//cyph.com//cyph-appointment-scheduler//EN'
					}).toString(),
					filename: 'invite.ics',
					method: 'request'
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
 *     description: string;
 *     endTime: number;
 *     inviterUsername: string;
 *     location: string;
 *     startTime: number;
 *     summary: string;
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
