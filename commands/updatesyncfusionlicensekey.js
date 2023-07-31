#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import fs from 'fs/promises';
import os from 'os';
import puppeteer from 'puppeteer';

const {sleep} = util;

const syncfusionCredentials = JSON.parse(
	(
		await fs.readFile(`${os.homedir()}/.cyph/syncfusion-credentials.json`)
	).toString()
);

const syncfusionLicenseKeyPath = `${__dirname}/../shared/js/cyph/syncfusion-license-key.ts`;

const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.goto('https://www.syncfusion.com/account/downloads');

await page.waitForSelector('#user-name');
await sleep(5000);
await page.type('#user-name', syncfusionCredentials.username);
await page.type('#password', syncfusionCredentials.password);
await page.click('#cookiesubs');
await page.click('#sign-in');

await page.waitForSelector('.link-options > .licensefile');
await sleep(5000);
await page.click('.link-options > .licensefile');
await sleep(5000);
await page.click('#EssentialStudioPlatforms + div > button');
await sleep(5000);
await page.click('input[type="checkbox"][value="javascript"]');
await page.click('#EssentialStudioPlatforms + div > button');
await page.click('button[data-id="EssentialStudioVersions"]');
await sleep(5000);
await page.click('.dropdown-menu.open a[tabindex="0"]');
await sleep(5000);
await page.click('#download-license-file');

await page.waitForSelector('#license-key-values');
await sleep(5000);

const syncfusionLicenseKey = (
	await (await page.$('#license-key-values')).evaluate(elem => elem.innerText)
).trim();

await fs.writeFile(
	syncfusionLicenseKeyPath,
	`/** Syncfusion license key. */\nexport const syncfusionLicenseKey = '${syncfusionLicenseKey}';\n`
);

process.exit(0);
