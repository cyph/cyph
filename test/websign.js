#!/usr/bin/env mocha

var webdriver	= require('browserstack-webdriver');
var test		= require('browserstack-webdriver/testing');


var testCases	= [
	{browser: 'Firefox'},
	{browser: 'Safari'},
	{browser: 'IE', browser_version: 10, shouldFail: true},
	{browser: 'IE', browser_version: 11},
	{browser: 'Chrome'},
	{browser: 'Opera', shouldFail: true},
	{browser: 'Android', device: 'Google Nexus 6'}, /* Android 5.0 */
	{browser: 'Android', device: 'Samsung Galaxy S5'}, /* Android 4.4 */
	{browser: 'Android', device: 'Samsung Galaxy S4'}, /* Android 4.3 */
	{browser: 'Android', device: 'Google Nexus 4'}, /* Android 4.2 */
	{browser: 'Android', device: 'Samsung Galaxy S3'}, /* Android 4.1 */
	{browser: 'Android', device: 'Google Nexus'}, /* Android 4.0 */
	{browser: 'iPhone', device: 'iPhone 5S'}, /* iOS 7 */
	{browser: 'iPhone', device: 'iPhone 5'}, /* iOS 6.1 */
	{browser: 'iPad', device: 'iPad Air'} /* iOS 7 */
];


function runTest (i) {

	var o	= testCases[i];

	if (!o) {
		return;
	}

	test.describe('WebSign', function () {
		var capabilities	= {
			'browserName': '',
			'browserstack.user': 'cyph2',
			'browserstack.key': 'TLsyvgYmyGYgtX31TsYs',
			'browserstack.debug': true
		};

		for (var k in o) {
			capabilities[k]	= o[k];
		}

		var driver	= new webdriver.Builder().
			usingServer('http://hub.browserstack.com/wd/hub').
			withCapabilities(capabilities).
			build()
		;


		driver.get('https://master-dot-cyph-im-dot-cyphme.appspot.com/#new');


		test.it('should load the app: ' + JSON.stringify(o), function () {
			driver.wait(function () {
				return driver.isElementPresent(webdriver.By.id('copy-url')).then(function (isPresent) {
					return isPresent == !o.shouldFail;
				});
			}, o.shouldFail ? 5000 : 120000);
		});


		var retryTimer	= setTimeout(function () {
			try {
				driver.quit();
			}
			catch (e) {}

			runTest(i);
		}, 300000);

		function postTest () {
			driver.takeScreenshot().then(function () {
				driver.quit();
				runTest(i + 1);
			});
		}

		test.after(function() {
			clearTimeout(retryTimer);

			driver.switchTo().alert().then(function (alert) {
				alert.dismiss().then(postTest, postTest);
			}, postTest);
		});
	});

}

runTest(0);
