#!/usr/bin/env node

const fs = require('fs');
const os = require('os');

const tmpParent = fs.mkdtempSync(`${os.homedir()}/`);
const tmp = `${tmpParent}/root`;

fs.mkdirSync(tmp);

fs.symlinkSync(`${__dirname}/../shared`, `${tmpParent}/shared`);
fs.symlinkSync(
	`${os.homedir()}/.cyph/email-credentials.js`,
	`${tmp}/email-credentials.js`
);
fs.symlinkSync(
	`${__dirname}/../backend/shared/email.html`,
	`${tmp}/email.html`
);
fs.symlinkSync(`${__dirname}/../backend/shared/templates`, `${tmp}/templates`);
fs.symlinkSync(
	`${__dirname}/../modules/dompurify-html-sanitizer.js`,
	`${tmp}/dompurify-html-sanitizer.js`
);
fs.symlinkSync(`${__dirname}/../modules/proto.js`, `${tmp}/proto.js`);
fs.symlinkSync(`${__dirname}/../modules/util.js`, `${tmp}/util.js`);
fs.writeFileSync(
	`${tmp}/index.js`,
	fs.readFileSync(`${__dirname}/../firebase/functions/email.js`)
);
fs.writeFileSync(
	`${tmp}/markdown-templating.js`,
	fs.readFileSync(`${__dirname}/../firebase/functions/markdown-templating.js`)
);
fs.writeFileSync(`${tmp}/namespaces.js`, 'module.exports = {};');

const sendMail = require(tmp).sendMailInternal;

if (require.main === module) {
	throw new Error('Email CLI command not implemented.');
}
else {
	module.exports = {sendMail};
}
