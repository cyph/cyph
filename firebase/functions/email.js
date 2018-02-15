const nodemailer	= require('nodemailer')
const auth			= require('./email-credentials');


const template		= fs.readFileSync(__dirname + '/email.html').toString().split('${TEXT}');
const transporter	= nodemailer.createTransport({auth, service: 'gmail'});

const sendMail		= async (to, subject, text) => transporter.sendMail({
	from: `Cyph <${auth.user}>`,
	html: template[0] + text.split('\n').map(s => `<p>${s}</p>`).join('') + template[1],
	subject,
	text,
	to
});


module.exports	= {sendMail};
