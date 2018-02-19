const fs			= require('fs');
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

const sendMailInternal	= async (to, subject, text, accountsURL) => transporter.sendMail({
	from: `Cyph <${auth.user}>`,
	html: mustache.render(await template, {accountsURL, lines: text.split('\n')}),
	subject,
	text,
	to
});

const sendMail			= async (database, namespace, url, subject, text) => {
	const ref	= database.ref(`${url}/internal/email`);
	const to	= (await ref.once('value')).val();

	if (to) {
		await sendMailInternal(to, subject, text, namespaces[namespace].accountsURL);
	}
};


module.exports	= {sendMail};
