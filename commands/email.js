#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import fs from 'fs/promises';
import os from 'os';
import {Emailer} from '../modules/email/emailer.js';

if (isCLI) {
	throw new Error('Email CLI command not implemented.');
}

const emailer = new Emailer(
	JSON.parse(
		(
			await fs.readFile(`${os.homedir()}/.cyph/email-credentials.json`)
		).toString()
	)
);

export const sendEmail = async (...args) => emailer.sendEmail(...args);
