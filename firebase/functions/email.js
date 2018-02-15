const fs			= require('fs')
const mustache		= require('mustache');
const nodemailer	= require('nodemailer')
const auth			= require('./email-credentials');


const template		= fs.readFileSync(__dirname + '/email.html').toString();
const transporter	= nodemailer.createTransport({auth, service: 'gmail'});

const sendMailInternal	= async (to, subject, text) => transporter.sendMail({
	from: `Cyph <${auth.user}>`,
	html: mustache.render(template, {lines: text.split('\n')}),
	subject,
	text,
	to
});

const sendMail			= async (database, url, subject, text) => {
	const ref	= database.ref(`${url}/emailInternal`);
	const to	= (await ref.once('value')).val();

	if (to) {
		await sendMailInternal(to, subject, text);
	}
};


module.exports	= {sendMail};
