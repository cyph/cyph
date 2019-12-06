const {format} = require('@cyph/prettier');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto('https://cyph.app', {timeout: 0});

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
				webSignCdnUrl: 'https://eu.cdn.cyph.com/cyph.app/',
				webSignExpires: localStorage.webSignExpires,
				webSignHashWhitelist: localStorage.webSignHashWhitelist,
				webSignPackageTimestamp: localStorage.webSignPackageTimestamp
			}
		})
	);

	const f = path.join(
		__dirname,
		'..',
		'www',
		'js',
		'default-cache-values.js'
	);

	fs.writeFileSync(
		f,
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

	await browser.close();

	childProcess.spawnSync(
		'git',
		['commit', '-m', 'updateDefaultCacheValues', f],
		{stdio: 'inherit'}
	);

	process.exit();
})().catch(() => process.exit(1));
