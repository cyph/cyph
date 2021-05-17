#!/usr/bin/env node

import fs from 'fs';
import {minify} from 'terser';

const varToSelfReplacements = new Set([
	'assets/node_modules/openpgp/dist/openpgp.min.js'
]);

const args = {
	path: process.argv[2]
};

(async () => {
	console.log(`Threadpack start: ${args.path}`);

	const code = fs
		.readFileSync(args.path)
		.toString()
		.replace(/importScripts\(\s*["'](.*?)["']\s*\)/g, (_, value) => {
			const scriptPath = value
				.slice(value[0] === '/' ? 1 : 0)
				.split('?')[0];

			let content =
				'\n\n' + fs.readFileSync(scriptPath).toString() + '\n\n';

			if (varToSelfReplacements.has(scriptPath)) {
				content = content.replace(/(^|\n)var /, '$1self.');
			}

			return content;
		});

	const {error} = minify(code);

	if (error) {
		fs.appendFileSync(
			'/cyph/threadpack.log',
			`${args.path}:\n\n${code}\n\n\n\n\n\n\n\n`
		);
		throw error;
	}

	fs.writeFileSync(args.path, code);

	console.log(`Threadpack complete: ${args.path}`);

	process.exit(0);
})().catch(err => {
	console.error(`Threadpack fail: ${args.path}`, err);
	process.exit(1);
});
