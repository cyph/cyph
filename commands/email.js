#!/usr/bin/env node


const fs	= require('fs');
const os	= require('os');


const tmp	= fs.mkdtempSync(`${os.homedir()}/`);

fs.symlinkSync(`${os.homedir()}/.cyph/email-credentials.js`, `${tmp}/email-credentials.js`);
fs.symlinkSync(`${__dirname}/../backend/shared/email.html`, `${tmp}/email.html`);
fs.symlinkSync(`${__dirname}/../modules/util.js`, `${tmp}/util.js`);
fs.writeFileSync(`${tmp}/index.js`, fs.readFileSync(`${__dirname}/../firebase/functions/email.js`));
fs.writeFileSync(`${tmp}/namespaces.js`, 'module.exports = {};');

const sendMail	= require(tmp).sendMailInternal;


if (require.main === module) {
	throw new Error('Email CLI command not implemented.');
}
else {
	module.exports	= {sendMail};
}
