const fs			= require('fs');
const ical			= require('ical-generator');
const mustache		= require('mustache');
const nodemailer	= require('nodemailer');
const auth			= require('./email-credentials');
const namespaces	= require('./namespaces');


const transporter	= nodemailer.createTransport({auth, service: 'gmail'});

const template		= new Promise((resolve, reject) => {
	fs.readFile(__dirname + '/email.html', (err, data) => {
		if (err) {
			reject(err);
		}
		else {
			resolve(data.toString());
		}
	});
});

const getEmailAddress	= async (database, namespace, username) => {
	let email, name;

	if (typeof username === 'object') {
		email	= username.email;
		name	= username.name;
	}
	else {
		const internalURL	= `${namespace}/users/${normalize(username)}/internal`;

		[email, name]		= (await Promise.all(['email', 'name'].map(async k =>
			database.ref(`${internalURL}/${k}`).once('value')
		))).map(o =>
			o.val() || undefined
		);
	}

	return {
		email,
		formatted: !email ? undefined : !name ? email : `${name} <${email}>`,
		name
	};
};

const sendMailInternal	= async (
	to,
	subject,
	text,
	eventDetails,
	eventInviter,
	accountsURL
) => transporter.sendMail({
	from: `Cyph <${auth.user}>`,
	html: !text ? '' : mustache.render(await template, {accountsURL, lines: text.split('\n')}),
	icalEvent: !eventDetails ? undefined : {
		content: ical({
			domain: 'cyph.com',
			events: [{
				attendees: [to, eventInviter],
				description: eventDetails.description,
				end: new Date(eventDetails.endTime),
				location: eventDetails.location,
				organizer: eventInviter,
				start: new Date(eventDetails.startTime),
				summary: eventDetails.summary || subject
			}],
			prodId: '//cyph.com//cyph-appointment-scheduler//EN'
		}).toString(),
		filename: 'invite.ics',
		method: 'request'
	},
	subject,
	text: text || '',
	to: typeof to === 'string' ? to : to.formatted
});

/**
 * @param {{
 *     description: string;
 *     endTime: number;
 *     inviterUsername: string;
 *     location: string;
 *     startTime: number;
 *     summary: string;
 * }} eventDetails
 */
const sendMail			= async (database, namespace, username, subject, text, eventDetails) => {
	const to	= await getEmailAddress(database, namespace, username);

	if (!to.formatted) {
		return;
	}

	const eventInviter	= eventDetails && typeof eventDetails.inviterUsername === 'string' ?
		await getEmailAddress(database, namespace, eventDetails.inviterUsername) :
		undefined
	;

	await sendMailInternal(
		to,
		subject,
		text,
		eventDetails,
		eventInviter,
		namespaces[namespace].accountsURL
	);
};


module.exports	= {sendMail, sendMailInternal};
