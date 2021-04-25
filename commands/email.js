#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import fs from 'fs';
import os from 'os';

if (isCLI) {
	throw new Error('Email CLI command not implemented.');
}

const tmpParent = fs.mkdtempSync(`${os.homedir()}/`);
const tmp = `${tmpParent}/root`;

fs.mkdirSync(tmp);

fs.symlinkSync(`${__dirname}/../shared`, `${tmpParent}/shared`);
fs.writeFileSync(
	`${tmp}/email-credentials.js`,
	fs.readFileSync(`${os.homedir()}/.cyph/email-credentials.js`)
);
fs.symlinkSync(
	`${__dirname}/../backend/shared/email.html`,
	`${tmp}/email.html`
);
fs.symlinkSync(`${__dirname}/../backend/shared/templates`, `${tmp}/templates`);
fs.writeFileSync(
	`${tmp}/base.js`,
	fs.readFileSync(`${__dirname}/../modules/base.js`)
);
fs.symlinkSync(
	`${__dirname}/../modules/dompurify-html-sanitizer.js`,
	`${tmp}/dompurify-html-sanitizer.js`
);
fs.writeFileSync(
	`${tmp}/package.json`,
	fs.readFileSync(`${__dirname}/package.json`)
);
fs.writeFileSync(
	`${tmp}/index.js`,
	fs.readFileSync(`${__dirname}/../firebase/functions/js/email.js`)
);
fs.writeFileSync(
	`${tmp}/markdown-templating.js`,
	fs.readFileSync(
		`${__dirname}/../firebase/functions/js/markdown-templating.js`
	)
);
fs.writeFileSync(`${tmp}/namespaces.js`, 'export const namespaces = {};');

export const sendEmail = (await import(`${tmp}/index.js`)).sendEmailInternal;
