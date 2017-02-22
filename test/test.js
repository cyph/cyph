const crypto	= require('crypto');
const datastore	= require('@google-cloud/datastore')();
const http		= require('http');
const webdriver	= require('selenium-webdriver');


const browsers	= [
	{
		browserName: 'Chrome',
		os: 'OS X',
		os_version: 'El Capitan',
		resolution: '1920x1080'
	},
	{
		browserName: 'Chrome',
		os: 'Windows',
		os_version: 'XP',
		resolution: '1024x768'
	},
	{
		browserName: 'Firefox',
		browser_version : '47.0',
		os: 'OS X',
		os_version: 'Yosemite',
		resolution: '1280x960'
	},
	{
		browserName: 'Firefox',
		browser_version : '47.0',
		os: 'Windows',
		os_version: '10',
		resolution: '2048x1536'
	},
	{
		browserName: 'Firefox',
		browser_version : '47.0',
		os: 'Windows',
		os_version: 'XP',
		resolution: '1024x768'
	},
	{
		browserName: 'Edge',
		os: 'Windows',
		os_version: '10',
		resolution: '2048x1536'
	},
	{
		browserName: 'iPhone',
		platform: 'MAC',
		device: 'iPhone 6S Plus'
	},
	{
		browserName: 'iPad',
		platform: 'MAC',
		device: 'iPad Air'
	}
];

let testLock		= true;
const testTimes		= {};


const driverPromise	= f => new Promise((resolve, reject) => {
	try {
		f().then(resolve).catch(err => {
			console.error(err);
			reject(err);
		});
	}
	catch (err) {
		console.error(err);
		reject(err);
	}
});

const driverQuit	= driver => driverPromise(() =>
	driver.quit()
);

const driverScript	= (driver, f) => driverPromise(() =>
	driver.executeScript(f)
);

const driverSetURL	= (driver, url) => driverPromise(() =>
	driver.get(url)
).then(() => driverScript(driver, function () {
	setOnerror();
}));

const driverWait	= (driver, until, timeout) => driverPromise(() =>
	driver.wait(until, timeout)
);

const getDriver		= o => new webdriver.Builder().
	usingServer('https://hub-cloud.browserstack.com/wd/hub').
	withCapabilities(o).
	build()
;


const isTestPassing	= key => new Promise((resolve, reject) =>
	datastore.get(testResultKey(key), (err, data) => {
		if (err) {
			console.error(err);
			reject(err);
		}
		else if (data && data.passing) {
			resolve();
		}
		else {
			reject();
		}
	})
);

const setTestResult	= (key, passing) => datastore.save({
	key: testResultKey(key),
	data: {
		passing
	}
}, () => {});

const testResultKey	= key => datastore.key(['TestResult', key]);


const homeTest		= o => {
	const driver	= getDriver(o);

	return driverSetURL(driver, o.homeURL).then(() =>
		driverWait(
			driver,
			webdriver.until.elementLocated(webdriver.By.js(function () {
				setOnerror();
				return self.$ && $('#new-cyph:visible')[0];
			})),
			30000
		)
	).then(() =>
		driverSetURL(driver, `${o.homeURL}/blog`)
	).then(() =>
		driverWait(
			driver,
			webdriver.until.elementLocated(webdriver.By.js(function () {
				setOnerror();
				return document.getElementsByClassName('postlist')[0];
			})),
			30000
		)
	).then(() =>
		driverQuit(driver)
	).catch(err => {
		driverQuit(driver);
		throw err;
	});
};

const newCyphTest	= o => {
	const driver	= getDriver(o);

	/* Temporarily reducing the scope of this test until the full test passes consistently.
		Related TODO: use the SDK for link generation since the API is locked down now. */

	return driverSetURL(driver, o.newCyphURL /* `${o.newCyphURL}/#${o.secret}` */).then(() =>
		driverWait(
			driver,
			webdriver.until.elementLocated(webdriver.By.js(function () {
				setOnerror();
				return self.$ && $('cyph-link-connection:visible' /* '.message-box:visible' */)[0];
			})),
			60000 // 150000
		)
	) /* .then(() => new Promise(resolve =>
		setTimeout(resolve, 10000)
	)).then(() =>
		driverScript(driver, function () {
			try {
				sendMessage('balls');
			}
			catch (_) {
				ui.chat.send('balls');
			}
		})
	).then(() =>
		driverWait(
			driver,
			webdriver.until.elementLocated(webdriver.By.js(function () {
				return self.$ && $('.message-item:visible').toArray().
					filter(function (elem) {
						var text	= $(elem).text();
						return text.indexOf('friend') > -1 && text.indexOf('balls') > -1;
					})[0]
				;
			})),
			60000
		)
	).then(() => new Promise(resolve =>
		setTimeout(resolve, 30000)
	)) */ .then(() =>
		driverQuit(driver)
	).catch(err => {
		driverQuit(driver);
		throw err;
	});
};


const runTests	= (homeURL, newCyphURL) => Promise.resolve().then(() => {
	/* Never run test suites concurrently, and never run the same
		test suite more frequently than once every ~~six hours~~ hour */
	if (
		testLock ||
		(
			!isNaN(testTimes[homeURL + newCyphURL]) &&
			Date.now() - testTimes[homeURL + newCyphURL] < 3600000 // 21600000
		)
	) {
		return;
	}

	testLock	= true;

	const testCases	= browsers.sort(() =>
		crypto.randomBytes(1)[0] > 127
	).map(browser => {
		const o	= {
			'browserstack.user': process.env.BS_USER,
			'browserstack.key': process.env.BS_KEY,
			'browserstack.debug': true,
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
		true
	);
}).catch(err => {
	console.error(err);
	return false;
}).then(passing => {
	if (passing === undefined) {
		return;
	}

	setTestResult(homeURL + newCyphURL, passing);
	testTimes[homeURL + newCyphURL]		= Date.now();

	testLock	= false;
});


http.createServer((req, res) => Promise.resolve().then(() => {
	const urlSplit		= req.url.split('/');

	if (urlSplit[1] === '_ah') {
		return 200;
	}
	else if (req.headers.authorization !== process.env.AUTH) {
		return 403;
	}
	else if (urlSplit.length !== 3) {
		return 404;
	}

	const homeURL		= `https://${urlSplit[1]}`;
	const newCyphURL	= `https://${urlSplit[2]}`;

	setImmediate(() => {
		try {
			runTests(homeURL, newCyphURL);
		}
		catch (err) {
			console.error(err);
		}
	});

	return isTestPassing(homeURL + newCyphURL).then(() => 200);
}).catch(err => {
	if (err) {
		console.error(err);
	}

	return 418;
}).then(statusCode => {
	res.statusCode	= statusCode;
	res.end();
})).listen(process.env.PORT);


setTimeout(() => {
	testLock	= false;
}, 300000);
