const {format} = require('@cyph/prettier');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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
			localforage: (await Promise.all(
				(await localforage.keys())
					.filter(k => /^websign-(fetch|sri-cache)/.test(k))
					.map(async k => Promise.all([k, localforage.getItem(k)]))
			))
				.filter(
					([_, v]) =>
						!/(crypto|mceliece|ntru|potassium|rlwe|rsasign|sidh|sphincs|superSphincs|xkcdPassphrase)/.test(
							v
						)
				)
				.reduce((o, [k, v]) => ({...o, [k]: v}), {}),
			localStorage: {
				webSignExpires: localStorage.webSignExpires,
				webSignHashWhitelist: localStorage.webSignHashWhitelist,
				webSignPackageTimestamp: localStorage.webSignPackageTimestamp
			}
		})
	);

	fs.writeFileSync(
		defaultCacheValuesPath,
		format(`var defaultCacheValues = ${cacheValues};`, {
			arrowParens: 'avoid',
			bracketSpacing: false,
			endOfLine: 'lf',
			htmlWhitespaceSensitivity: 'css',
			jsxBracketSameLine: false,
			jsxSingleQuote: false,
			parser: 'babel',
			printWidth: 80,
			proseWrap: 'always',
			quoteProps: 'consistent',
			semi: true,
			singleQuote: true,
			tabWidth: 4,
			trailingComma: 'none',
			useTabs: true
		}).replace(' =', '\t=')
	);

	fs.unlinkSync(cordovaJSPath);

	await browser.close();

	process.exit();
})().catch(err => {
	console.error(err);
	process.exit(1);
});
