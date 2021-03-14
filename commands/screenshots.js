#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import fs from 'fs';
import os from 'os';
import puppeteer from 'puppeteer';

const credentials = {
	password: fs
		.readFileSync(`${os.homedir()}/.cyph/screenshotmasterkey`)
		.toString()
		.trim(),
	username: 'WizardOfLoneliness',
	usernameAlt: 'bonedaddy'
};

const resolutions = [
	{name: 'mac', viewport: {height: 1800, isMobile: false, width: 2880}},
	{name: 'desktop', viewport: {height: 1642, isMobile: false, width: 2878}},
	{
		name: 'desktop-alt',
		viewport: {height: 1600, isMobile: false, width: 2560}
	},
	{name: 'ios129', viewport: {height: 2732, isMobile: true, width: 2048}},
	{name: 'ios65', viewport: {height: 2688, isMobile: true, width: 1242}},
	{name: 'ios55', viewport: {height: 2208, isMobile: true, width: 1242}},
	{
		name: 'mobile',
		viewport: {height: 1100 * 2, isMobile: true, width: 550 * 2}
	},
	{
		name: 'mobile-alt',
		viewport: {height: 788 * 2, isMobile: true, width: 380 * 2}
	},
	{
		name: 'ss1920x1080',
		viewport: {height: 1080, isMobile: false, width: 1920}
	},
	{name: 'ss1920x908', viewport: {height: 908, isMobile: false, width: 1920}},
	{
		name: 'ss1536x2331',
		viewport: {height: 2331, isMobile: true, width: 1536}
	},
	{name: 'ss949x1440', viewport: {height: 1440, isMobile: true, width: 949}},
	{name: 'ss666x1105', viewport: {height: 1105, isMobile: true, width: 666}}
];

const screenshotDir = '/cyph/screenshots';
const screenshotEnv = 'https://staging.cyph.app';

const click = async (page, selector, doubleClick = false) => {
	await page.waitForSelector(selector);
	await page.evaluate(
		({doubleClick, selector}) => {
			const elem = document.querySelector(selector);
			elem.click();
			if (doubleClick) {
				elem.click();
			}
		},
		{doubleClick, selector}
	);
};

const setViewport = async (page, viewport) => {
	const deviceScaleFactor =
		Math.max(viewport.width, viewport.height) /
		(viewport.isMobile ? 850 : 1280);

	if (viewport.isMobile) {
		await page.setUserAgent(
			'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36'
		);
	}

	await page.setViewport({
		...viewport,
		deviceScaleFactor,
		hasTouch: viewport.isMobile,
		height: Math.round(viewport.height / deviceScaleFactor),
		width: Math.round(viewport.width / deviceScaleFactor)
	});
};

const logIn = async (username, isMobile) => {
	const browser = await puppeteer.launch({
		args: ['--enable-font-antialiasing', '--font-render-hinting=none'],
		headless: true
	});

	const page = await browser.newPage();

	page.setDefaultTimeout(0);
	page.setDefaultNavigationTimeout(0);

	await setViewport(
		page,
		resolutions.find(o => o.viewport.isMobile === isMobile).viewport
	);
	await page.goto(screenshotEnv);
	await page.evaluate(() => {
		localStorage.debug = true;
	});
	await page.reload();

	await click(page, 'button[routerlink="login"]');
	await new Promise(resolve => setTimeout(resolve, 5000));
	await page.waitForSelector('[name="cyphUsername"]');
	await page.type('[name="cyphUsername"]', username);
	await page.waitForSelector('[name="masterKey"]');
	await page.type('[name="masterKey"]', credentials.password);
	await click(page, 'button[type="submit"]');

	if (!isMobile) {
		await page.waitForSelector('img[alt="Profile Picture"]');
	}

	await click(
		page,
		'.cyph-banner.alert div:not(.visibility-hidden) > button.close'
	);

	return {browser, page};
};

const loadContacts = async page => {
	await new Promise(resolve => setTimeout(resolve, 30000));
	await page.evaluate(() => {
		(async () => {
			const contacts = Array.from(
				document.querySelectorAll(
					'cyph-account-contact .mat-card-avatar'
				)
			)
				.filter(elem => elem.textContent === 'person')
				.map(elem =>
					elem.parentElement
						.querySelector('mat-card-title')
						.textContent.slice(1)
				);

			for (const contact of contacts) {
				await router.navigate(['profile', contact]);
				await new Promise(resolve => setTimeout(resolve, 10000));
			}

			await router.navigate([
				accountService.envService.isMobileOS ? 'contacts' : 'messaging'
			]);
		})();
	});
	await new Promise(resolve => setTimeout(resolve, 60000));
};

const openChat = async page => {
	await click(page, 'cyph-account-contact:nth-of-type(3) mat-card');
	await page.waitForSelector(
		'[data-message-id="987ed37d79b66977b32af77459677bc2b43e8ff7cda055af7a46a2638a6212b8c646446b70d38c96972c4f0218d87fdcce2a8460a306340ae40028f45d9fe2bc8af2fe0c"] cyph-markdown'
	);
	// await click(page, '.spoiler-message');
	// await page.waitForSelector('img.media-message');
};

const toggleMobileMenu = async (page, isMobile) => {
	if (!isMobile) {
		return;
	}

	await click(page, '.header button[aria-label="Menu"]');
};

const takeScreenshot = async (page, isMobile, screenshotName) => {
	await new Promise(resolve => setTimeout(resolve, 5000));

	for (const {name, viewport} of resolutions.filter(
		o => o.viewport.isMobile === isMobile
	)) {
		console.log({isMobile, name, screenshotName, viewport});
		await setViewport(page, viewport);
		await page.screenshot({
			path: `${screenshotDir}/${name}/${screenshotName}.png`
		});
	}
};

export const generateScreenshots = async () => {
	if (fs.existsSync(screenshotDir)) {
		throw new Error(`${screenshotDir} already exists.`);
	}

	fs.mkdirSync(screenshotDir);
	for (const {name} of resolutions) {
		fs.mkdirSync(`${screenshotDir}/${name}`);
	}

	for (const isMobile of [false, true]) {
		const {browser, page} = await logIn(credentials.username, isMobile);

		if (isMobile) {
			await toggleMobileMenu(page, isMobile);
			await click(page, '[routerlink="/profile"]');
		}

		await takeScreenshot(page, isMobile, 'profile');

		await toggleMobileMenu(page, isMobile);
		await takeScreenshot(page, isMobile, 'menu');
		await click(page, '[routerlink="/messaging"]');

		if (isMobile) {
			await click(page, '[routerlink="/contacts"]');
		}

		await loadContacts(page);
		await page.waitForSelector(
			'cyph-account-contact:nth-of-type(4) img[alt="User Avatar"]'
		);
		await takeScreenshot(page, isMobile, 'messages');

		await openChat(page);
		await takeScreenshot(page, isMobile, 'chat');

		for (const {name, openFile, route} of [
			{name: 'files', openFile: true, route: 'files'},
			{name: 'meetings', route: 'schedule'},
			{name: 'notes', openFile: true, route: 'notes'},
			{name: 'pgp', route: 'pgp'}
		]) {
			await toggleMobileMenu(page, isMobile);
			await click(page, '[routerlink="/vault"]');
			await click(page, `[routerlink="/${route}"]`);
			await takeScreenshot(page, isMobile, name);

			if (!openFile) {
				continue;
			}

			await click(
				page,
				!isMobile && name === 'files' ?
					'.dx-data-row:first-of-type' :
					'mat-row:first-of-type, mat-card:first-of-type',
				!isMobile
			);
			await page.waitForSelector(
				'[mattooltip="Back"], [mattooltip="Close"]'
			);
			await new Promise(resolve => setTimeout(resolve, 5000));
			await takeScreenshot(page, isMobile, `${name}-open`);
			await click(page, '[mattooltip="Back"], [mattooltip="Close"]');
		}

		await toggleMobileMenu(page, isMobile);
		await click(page, '[routerlink="/feed"]');
		await page.waitForSelector('cyph-account-post');
		await takeScreenshot(page, isMobile, 'feed');

		await browser.close();

		const {browser: browserAlt, page: pageAlt} = await logIn(
			credentials.usernameAlt,
			isMobile
		);

		await toggleMobileMenu(pageAlt, isMobile);
		await click(pageAlt, '[routerlink="/messaging"]');
		await loadContacts(pageAlt);
		await openChat(pageAlt);
		await takeScreenshot(pageAlt, isMobile, 'chat-alt');

		await browserAlt.close();
	}
};

if (isCLI) {
	(async () => {
		console.log(await generateScreenshots());
		process.exit();
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
