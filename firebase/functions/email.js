const fs			= require('fs')
const mustache		= require('mustache');
const nodemailer	= require('nodemailer')
const auth			= require('./email-credentials');


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

const sendMailInternal	= async (to, subject, text) => transporter.sendMail({
	from: `Cyph <${auth.user}>`,
	html: mustache.render(await template, {lines: text.split('\n')}),
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
