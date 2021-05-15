#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import fs from 'fs';
import puppeteer from 'puppeteer';
import nodeUtil from 'util';

/** TODO: Handle this locally. */
export const getQR = async (text, path) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto(
		'https://www.bitcat.cc/webapp/awesome-qr/index.html#customize'
	);

	await page.waitForSelector('#contents');

	await page.evaluate(() => {
		document.getElementById('contents').value = '';
		document.getElementById('in-size').value = '';
		document.getElementById('in-margin').value = '';
		document.getElementById('in-dotScale').value = '';
	});

	await page.type('#contents', text);
	await page.type('#in-size', '800');
	await page.type('#in-margin', '20');
	await page.type('#in-dotScale', '0.5');

	await (
		await page.$('#background-img-select-native')
	).uploadFile(`${__dirname}/../shared/assets/img/cyph.icon.png`);

	await nodeUtil.promisify(setTimeout)(1000);
	await page.evaluate(() => j_generate());
	await page.waitForSelector('#qrcode');

	const qrCode = await page.evaluate(
		() => document.getElementById('qrcode').src
	);

	await browser.close();

	if (path) {
		fs.writeFileSync(
			path,
			Buffer.from(qrCode.split(';base64,')[1], 'base64')
		);
		return path;
	}

	return qrCode;
};

if (isCLI) {
	(async () => {
		console.log(await getQR(process.argv[2], process.argv[3]));
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
