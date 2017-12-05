#!/usr/bin/env node


const fs	= require('fs');


(async () => {


const args	= {
	path: process.argv[2]
};


fs.writeFileSync(
	args.path,
	fs.readFileSync(args.path).toString().replace(
		/importScripts\(["'](.*?)["']\)/g,
		(_, value) => '(function () {' +
			fs.readFileSync(
				value.slice(value[0] === '/' ? 1 : 0).split('?')[0]
			).toString() +
		'}).call(this)'
	)
);


})();
