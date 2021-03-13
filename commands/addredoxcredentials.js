#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import fs from 'fs';
import os from 'os';
import puppeteer from 'puppeteer';

export const addRedoxCredentials = async (
	isProd,
	url,
	username,
	redoxApiKey,
	redoxSecret
) => {
	url =
		typeof url !== 'string' ?
			undefined :
		url.endsWith('/#') ?
			url :
		url.endsWith('/#/') ?
			url.slice(0, -1) :
		url.indexOf('#') < 0 ?
			`${url}/#` :
			undefined;

	if (
		typeof url !== 'string' ||
		typeof isProd !== 'boolean' ||
		typeof username !== 'string' ||
		typeof redoxApiKey !== 'string' ||
		typeof redoxSecret !== 'string'
	) {
		throw new Error(
			'addredoxcredentials ' +
				'(--prod) ' +
				'[Cyph environment URL, e.g. ' +
				'https://cyph.app or https://cyph.wang/simple-master' +
				'] ' +
				'[org Cyph username] ' +
				'[Redox API key] ' +
				'[Redox API secret]'
		);

		return;
	}

	const cyphAdminKey = fs
		.readFileSync(
			`${os.homedir()}/.cyph/backend.vars.${isProd ? 'prod' : 'sandbox'}`
		)
		.toString()
		.split('CYPH_ADMIN_KEY')[1]
		.split("'")[1];
	for (let i = 0; i < 10; ++i) {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();

		await page.goto(
			`${url}upload-ehr-credentials/${cyphAdminKey}/${redoxApiKey}/${redoxSecret}/${username}`
		);

		await page.waitForSelector('cyph-upload-ehr-credentials > div');

		const apiKey = await page.evaluate(
			() =>
				(
					document.querySelector(
						'cyph-upload-ehr-credentials > div.done'
					) || {}
				).textContent
		);

		await browser.close();

		if (typeof apiKey === 'string' && apiKey.length > 0) {
			return apiKey;
		}
	}

	throw new Error('Uploading EHR credentials failed.');
};

if (isCLI) {
	(async () => {
		const isProd =
			process.argv.slice(2).find(s => s === '--prod') !== undefined;
		const args = process.argv.slice(2).filter(s => s !== '--prod');

		const url = args[0];
		const username = args[1];
		const redoxApiKey = args[2];
		const redoxSecret = args[3];

		console.log(
			await addRedoxCredentials(
				isProd,
				url,
				username,
				redoxApiKey,
				redoxSecret
			)
		);
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
