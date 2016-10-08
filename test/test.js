const crypto	= require('crypto');
const http		= require('http');
const webdriver	= require('selenium-webdriver');


const browsers	= [
	{
		browserName: 'Chrome',
		os: 'OS X',
		os_version: 'El Capitan',
		resolution: '1024x768'
	},
	{
		browserName: 'Chrome',
		os: 'Windows',
		os_version: '7',
		resolution: '2048x1536'
	},
	{
		browserName: 'Firefox',
		os: 'Windows',
		os_version: '10',
		resolution: '1920x1080'
	},
	{
		browserName: 'Safari',
		os: 'OS X',
		os_version: 'El Capitan',
		resolution: '1280x1024'
	},
	{
		browserName: 'iPhone',
		platform: 'MAC',
		device: 'iPhone 6S Plus'
	},
	{
		browserName: 'android',
		platform: 'ANDROID',
		device: 'Samsung Galaxy S5'
	}
];


const getDriver		= o => new webdriver.Builder().
	usingServer('http://hub-cloud.browserstack.com/wd/hub').
	withCapabilities(o).
	build()
;

const homeTest		= o => {
	const driver	= getDriver(o);

	return Promise.resolve().then(() => {
		driver.get(o.homeURL);

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.js(function () {
				return self.$ && $('#new-cyph:visible')[0];
			})),
			15000
		);
	}).then(() => {
		driver.get(`${o.homeURL}/blog`);

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.js(function () {
				return document.getElementsByClassName('postlist')[0];
			})),
			15000
		);
	}).then(() =>
		driver.quit()
	).catch(err => {
		driver.quit();
		throw err;
	});
};

const newCyphTest	= o => {
	const driver	= getDriver(o);

	return Promise.resolve().then(() => {
		driver.get(`${o.newCyphURL}/#${o.secret}`);

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.js(function () {
				return self.$ && $('.message-box:visible')[0];
			})),
			300000
		);
	}).then(results => {
		driver.executeScript(function () { ui.chat.send('balls') });

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.js(function () {
				return self.$ && $('.message-item:visible').toArray().
					filter(function (elem) {
						return $(elem).text().
							replace(/\s+/g, '').
							indexOf('friend:balls') > -1
						;
					})[0]
				;
			})),
			15000
		);
	}).then(() =>
		driver.quit()
	).catch(err => {
		driver.quit();
		throw err;
	});
};


const server	= http.createServer((req, res) => Promise.resolve().then(() => {
	const urlSplit		= req.url.split('/');

	if (urlSplit.length !== 3) {
		return 404;
	}

	const homeURL		= `https://${urlSplit[1]}`;
	const newCyphURL	= `https://${urlSplit[2]}`;

	const testCases	= browsers.sort(() =>
		crypto.randomBytes(1)[0] > 127
	).map(browser => {
		const o	= {
			'browserstack.user': process.env.BS_USER,
			'browserstack.key': process.env.BS_KEY,
			homeURL,
			newCyphURL
		};

		for (let k of Object.keys(browser)) {
			o[k]	= browser[k];
		}

		return o;
	}).reduce((acc, o) => {
		const a	= acc.slice(-1)[0];

		if (a.length === 1) {
			o.secret	= a[0].secret;
			a.push(o);
		}
		else {
			o.secret	= crypto.randomBytes(30).toString('hex');
			acc.push([o]);
		}

		return acc;
	}, [[]]);

	const lastTestCase	= testCases.slice(-1)[0];
	if (lastTestCase.length === 1) {
		lastTestCase.push(lastTestCase[0]);
	}

	return testCases.reduce(
		(promise, testCase) => promise.then(() =>
			Promise.all(
				testCase.map(o => homeTest(o))
			).then(() => Promise.all(
				testCase.map(o => newCyphTest(o))
			))
		),
		Promise.resolve()
	).then(() =>
		200
	).catch(err => {
		console.log(err);
		return 418;
	});
}).catch(err => {
	console.log(err);
	return 500;
}).then(statusCode => {
	res.statusCode	= statusCode;
	res.end();
}));

server.timeout	= 0;
server.listen(process.env.PORT);
