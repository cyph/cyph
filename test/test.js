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

	new Promise.resolve().then(() => {
		driver.get(o.homeUrl);

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.id('new-cyph')),
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

	new Promise.resolve().then(() => {
		driver.get(`${o.newCyphUrl}/#${o.secret}`);

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.js(() =>
				$('.message-box:visible')[0]
			)),
			45000
		);
	}).then(results => {
		driver.executeScript(() => ui.chat.send('balls'));

		return driver.wait(
			webdriver.until.elementLocated(webdriver.By.js(() =>
				$('.message-item:visible').toArray().filter(function (elem) {
					return $(elem).text().
						replace(/\s+/g, '').
						indexOf('friend:balls') > -1
					;
				})[0]
			)),
			5000
		);
	}).then(() =>
		driver.quit()
	).catch(err => {
		driver.quit();
		throw err;
	});
};


http.createServer((req, res) => {
	const urlSplit		= req.url.split('/');
	const homeUrl		= `https://urlSplit[0]`;
	const newCyphUrl	= `https://urlSplit[1]`;

	const testCases	= browsers.sort(() =>
		crypto.randomBytes(1)[0] > 127
	).map(browser => {
		const o	= {
			'browserstack.user': process.env.BS_USER,
			'browserstack.key': process.env.BS_KEY,
			homeUrl,
			newCyphUrl
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
	).catch(() =>
		418
	).then(statusCode => {
		res.statusCode	= statusCode;
		res.end();
	});
}).listen(process.env.PORT);
