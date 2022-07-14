const cyphPrettier = require('@cyph/prettier');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const packageJSON = JSON.parse(
	fs.readFileSync(path.join(__dirname, '..', '..', 'package.json')).toString()
);

const cordovaJSPath = path.join(__dirname, '..', 'www', 'cordova.js');

const defaultCacheValuesPath = path.join(
	__dirname,
	'..',
	'www',
	'js',
	'default-cache-values.js'
);

(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	page.setDefaultTimeout(0);
	page.setDefaultNavigationTimeout(0);

	fs.writeFileSync(
		cordovaJSPath,
		`
			self.history.pushState = undefined;
			self.cordova = {};
			self.device = {};
			document.addEventListener('DOMContentLoaded', () => {
				setTimeout(() => document.dispatchEvent(new Event('deviceready')), 250);
				setTimeout(() => document.dispatchEvent(new Event('backbutton')), 500);
			});
		`
	);

	await page.goto(`file://${__dirname}/../www/index.html`, {timeout: 0});

	await page.waitForSelector('cyph-account-login');

	const cacheValues = await page.evaluate(async () =>
		JSON.stringify({
			localStorage: {
				webSignExpires: localStorage.webSignExpires,
				webSignHashWhitelist: localStorage.webSignHashWhitelist,
				webSignPackageTimestamp: localStorage.webSignPackageTimestamp
			},
			webSignStorage: (
				await webSignStorage.bulkGet(
					await webSignStorage.toCollection().keys()
				)
			).filter(({value}) => !/(crypto|potassium)/.test(value))
		})
	);

	fs.writeFileSync(
		defaultCacheValuesPath,
		cyphPrettier
			.format(`self.defaultCacheValues = ${cacheValues};`, {
				...packageJSON.prettier,
				parser: 'babel'
			})
			.replace(' =', '\t=')
	);

	fs.unlinkSync(cordovaJSPath);

	await browser.close();

	process.exit();
})().catch(err => {
	console.error(err);
	process.exit(1);
});
