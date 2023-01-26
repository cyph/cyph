#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const tslib = require('tslib');

const mangleExceptions = Array.from(
	new Set([
		'babelHelpers',
		'firebase',
		...Object.keys(tslib),
		...(fs
			.readFileSync(
				path.join(
					__dirname,
					'..',
					'shared',
					'assets',
					'js',
					'standalone',
					'global.js'
				)
			)
			.toString()
			.match(/[A-Za-z_\$][A-Za-z0-9_\$]*/g) || [])
	])
).sort();

if (require.main === module) {
	console.log(JSON.stringify(mangleExceptions));
}
else {
	module.exports = {mangleExceptions};
}
