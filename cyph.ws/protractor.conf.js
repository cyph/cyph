// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const {SpecReporter}	= require('jasmine-spec-reporter');

exports.config	= {
	allScriptsTimeout: 480000,
	specs: [
		'./e2e/**/*.e2e-spec.ts'
	],
	capabilities: {
		browserName: 'chrome',
		chromeOptions: {
			args: ['--headless', '--disable-gpu', '--window-size=1280,800'],
			binary: process.env.CHROME_BIN
		}
	},
	directConnect: true,
	baseUrl: 'http://localhost:42002/',
	framework: 'jasmine',
	jasmineNodeOpts: {
		showColors: true,
		defaultTimeoutInterval: 960000,
		print: () => {}
	},
	onPrepare () {
		require('ts-node').register({
			project: 'e2e/tsconfig.e2e.json'
		});
		jasmine.getEnv().addReporter(new SpecReporter({spec: {displayStacktrace: true}}));
	}
};
