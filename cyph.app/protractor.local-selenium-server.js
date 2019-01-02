const fs		= require('fs');
const {config}	= require('./protractor.conf');

config.capabilities		= {browserName: 'chrome'};
config.directConnect	= false;
config.seleniumAddress	= `http://docker.for.${
	fs.existsSync('/windows') ? 'win' : 'mac'
}.host.internal:4444/wd/hub`;

exports.config	= config;
