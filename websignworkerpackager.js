#!/usr/bin/env node

var fs		= require('fs');
var args	= process.argv.slice(2);

var path	= args[0];

var newText	= fs.readFileSync(path).toString().replace(
	/importScriptsAndRetry\(["'](.*?)["']\)/g,
	function (match, value) {
		// console.log('REPLACING WEB WORKER IMPORT: ' + match);

		if (value[0] == '/') {
			value	= value.slice(1);
		}

		return fs.readFileSync(value.split('?')[0]).toString();
	}
);

fs.writeFileSync(path, newText);
