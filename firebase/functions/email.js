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

const getEmailAddress	= async (namespace, username) => {
	const internalURL	= `${namespace}/users/${normalize(username)}/internal`;

	const [email, name]	= (await Promise.all(['email', 'name'].map(async k =>
		database.ref(`${internalURL}/${k}`).once('value')
	))).map(o =>
		o.val() || undefined
	);

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
	eventInvitee,
	accountsURL
) => transporter.sendMail({
	from: `Cyph <${auth.user}>`,
	html: mustache.render(await template, {accountsURL, lines: text.split('\n')}),
	icalEvent: !eventDetails ? undefined : {
		content: ical({
			domain: 'cyph.com',
			events: [{
				attendees: [eventInvitee, to],
				description: eventDetails.description,
				end: new Date(eventDetails.endTime),
				location: eventDetails.location,
				organizer: to,
				start: new Date(eventDetails.startTime),
				summary: eventDetails.summary
			}],
			prodId: '//cyph.com//cyph-appointment-scheduler//EN'
		}).toString(),
		filename: 'invite.ics',
		method: 'request'
	},
	subject,
	text,
	to: !eventInvitee || !eventInvitee.formatted ?
		to.formatted :
		[eventInvitee.formatted, to.formatted]
});

/**
 * @param {{
 *     description: string;
 *     endTime: number;
 *     inviteeUsername: string;
 *     location: string;
 *     startTime: number;
 *     summary: string;
 * }} eventDetails
 */
const sendMail			= async (database, namespace, username, subject, text, eventDetails) => {
	const to	= await getEmailAddress(namespace, username);

	if (!to.formatted) {
		return;
	}

	const eventInvitee	= eventDetails && typeof eventDetails.inviteeUsername === 'string' ?
		await getEmailAddress(namespace, eventDetails.inviteeUsername) :
		undefined
	;

	await sendMailInternal(
		to,
		subject,
		text,
		eventDetails,
		eventInvitee,
		namespaces[namespace].accountsURL
	);
};


module.exports	= {sendMail};
