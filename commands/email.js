#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI, require} = getMeta(import.meta);

import fs from 'fs';
import os from 'os';

if (isCLI) {
	throw new Error('Email CLI command not implemented.');
}

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
fs.writeFileSync(
	`${tmp}/index.js`,
	fs.readFileSync(`${__dirname}/../firebase/functions/email.js`)
);
fs.writeFileSync(
	`${tmp}/markdown-templating.js`,
	fs.readFileSync(`${__dirname}/../firebase/functions/markdown-templating.js`)
);
fs.writeFileSync(`${tmp}/namespaces.js`, 'export const namespaces = {};');

export const sendMail = (await import(tmp)).sendMailInternal;
