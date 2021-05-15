const Cyph = require('@cyph/sdk');
const datastore = require('@google-cloud/datastore')();
const http = require('http');
const webdriver = require('selenium-webdriver');
const shuffle = require('shuffle-array');

const maxAttempts = 5;

const browsers = [
	{
		browserName: 'Chrome',
		os: 'OS X',
		os_version: 'Sierra',
		resolution: '1920x1080'
	},
	{
		browserName: 'Firefox',
		browser_version: '54.0',
		os: 'OS X',
		os_version: 'Sierra',
		resolution: '1280x960'
	},
	{
		browserName: 'Firefox',
		browser_version: '54.0',
		os: 'Windows',
		os_version: '10',
		resolution: '1920x1200'
	},
	{
		browserName: 'Edge',
		os: 'Windows',
		os_version: '10',
		resolution: '2048x1536'
	},
	{
		browserName: 'Safari',
		browser_version: '10.1',
		os: 'OS X',
		os_version: 'Sierra',
		resolution: '1920x1080'
	},
	{
		device: 'iPhone 7',
		realMobile: true,
		os_version: '10.0'
	}
];

let testLock = true;
const testTimes = {};

const driverPromise = f =>
	new Promise((resolve, reject) => {
		try {
			f()
				.then(resolve)
				.catch(err => {
					console.error(err);
					reject(err);
				});
		}
		catch (err) {
			console.error(err);
			reject(err);
		}
	});

const driverQuit = driver => driverPromise(() => driver.quit());

const driverScript = (driver, f) =>
	driverPromise(() => driver.executeScript(f));

const driverSetURL = (driver, url) =>
	driverPromise(() => driver.get(url)).then(() =>
		driverScript(driver, function () {
			setOnerror();
		})
	);

const driverWait = (driver, until, timeout) =>
	driverPromise(() => driver.wait(until, timeout));

const getDriver = o =>
	new webdriver.Builder()
		.usingServer('https://hub-cloud.browserstack.com/wd/hub')
		.withCapabilities(o)
		.build();
const isTestPassing = key =>
	new Promise((resolve, reject) =>
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

const setTestResult = (key, passing) =>
	datastore.save(
		{
			key: testResultKey(key),
			data: {passing}
		},
		() => {}
	);

const testResultKey = key => datastore.key(['TestResult', key]);

const homeTest = async o => {
	const driver = getDriver(o);

	try {
		await driverSetURL(driver, o.homeURL);
		await driverWait(
			driver,
			webdriver.until.elementLocated(
				webdriver.By.js(function () {
					setOnerror();
					return document.querySelector(
						'body.load-complete #new-cyph'
					);
				})
			),
			10000
		);
		await driverSetURL(driver, `${o.homeURL}/blog`);
		await driverWait(
			driver,
			webdriver.until.elementLocated(
				webdriver.By.js(function () {
					setOnerror();
					return document.getElementsByClassName('postlist')[0];
				})
			),
			10000
		);
	}
	finally {
		await driverQuit(driver);
	}
};

const newCyphTest = async (o, i) => {
	const driver = getDriver(o);

	try {
		await driverSetURL(driver, await o.cyphLinks[i]);
		await driverWait(
			driver,
			webdriver.until.elementLocated(
				webdriver.By.js(function () {
					setOnerror();
					return document.querySelector(
						'body.load-complete .message-box'
					);
				})
			),
			60000
		);
		await driverScript(driver, function () {
			sendMessage('balls');
		});
		await new Promise(resolve => setTimeout(resolve, 10000));
		await driverWait(
			driver,
			webdriver.until.elementLocated(
				webdriver.By.js(function () {
					return Array.from(
						document.querySelectorAll('.message-item')
					).filter(function (elem) {
						var text = elem.textContent;
						return (
							text.indexOf('friend') > -1 &&
							text.indexOf('balls') > -1
						);
					})[0];
				})
			),
			5000
		);
	}
	finally {
		await driverQuit(driver);
	}
};

const runTests = (backendURL, homeURL, newCyphURL, id) =>
	Promise.resolve()
		.then(async () => {
			/* Never run test suites concurrently, and never run the same
		test suite more frequently than once every six hours */
			if (
				testLock ||
				(!isNaN(testTimes[id]) && Date.now() - testTimes[id] < 21600000)
			) {
				return;
			}

			testLock = true;

			const testCases = shuffle(browsers)
				.map(browser => {
					const o = {
						'browserstack.user': process.env.BS_USER,
						'browserstack.key': process.env.BS_KEY,
						'browserstack.debug': true,
						homeURL
					};

					for (let k of Object.keys(browser)) {
						o[k] = browser[k];
					}

					return o;
				})
				.reduce(
					(acc, o) => {
						const a = acc.slice(-1)[0];

						if (a.length === 1) {
							o.cyphLinks = a[0].cyphLinks;
							a.push(o);
						}
						else {
							o.cyphLinks = new Array(maxAttempts).fill('').map(
								() =>
									new Cyph.initiateSession(
										process.env.AUTH,
										undefined,
										{
											backend: backendURL,
											chat: `${newCyphURL}/#`,
											video: `${newCyphURL}/#video/`,
											voice: `${newCyphURL}/#audio/`
										}
									)
							);

							acc.push([o]);
						}

						return acc;
					},
					[[]]
				);

			const lastTestCase = testCases.slice(-1)[0];
			if (lastTestCase.length === 1) {
				lastTestCase.push(lastTestCase[0]);
			}

			for (testFunction of [homeTest, newCyphTest]) {
				for (const testCase of testCases) {
					for (let i = 0; true; ++i) {
						try {
							await Promise.all(
								testCase.map(o => testFunction(o, i))
							);
							break;
						}
						catch (err) {
							if (i >= maxAttempts) {
								return false;
							}
						}
					}
				}
			}

			return true;
		})
		.catch(err => {
			console.error(err);
			return false;
		})
		.then(passing => {
			if (passing === undefined) {
				return;
			}

			setTestResult(id, passing);
			testTimes[id] = Date.now();

			testLock = false;
		});

http.createServer((req, res) =>
	Promise.resolve()
		.then(() => {
			return 200;
			/*
			const urlSplit = req.url.split('/');

			if (urlSplit[1] === '_ah') {
				return 200;
			}
			else if (req.headers.authorization !== process.env.AUTH) {
				return 403;
			}
			else if (urlSplit.length !== 4) {
				return 404;
			}

			const backendURL = `https://${urlSplit[1]}`;
			const homeURL = `https://${urlSplit[2]}`;
			const newCyphURL = `https://${urlSplit[3]}`;
			const id = backendURL + homeURL + newCyphURL;

			setImmediate(() => {
				try {
					runTests(backendURL, homeURL, newCyphURL, id);
				}
				catch (err) {
					console.error(err);
				}
			});

			return isTestPassing(id).then(() => 200);
			*/
		})
		.catch(err => {
			if (err) {
				console.error(err);
			}

			return 418;
		})
		.then(statusCode => {
			res.statusCode = statusCode;
			res.end();
		})
).listen(process.env.PORT);

setTimeout(() => {
	testLock = false;
}, 300000);
