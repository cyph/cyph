#!/usr/bin/env node

import fs from 'fs';
import terser from 'terser';

(async () => {
	const args = {
		path: process.argv[2]
	};

	const code = fs
		.readFileSync(args.path)
		.toString()
		.replace(
			/importScripts\(\s*["'](.*?)["']\s*\)/g,
			(_, value) =>
				'\n\n' +
				fs
					.readFileSync(
						value.slice(value[0] === '/' ? 1 : 0).split('?')[0]
					)
					.toString() +
				'\n\n'
		);

	const {error} = terser.minify(code);

	if (error) {
		fs.appendFileSync(
			'/cyph/threadpack.log',
			`${args.path}:\n\n${code}\n\n\n\n\n\n\n\n`
		);
		throw error;
	}

	fs.writeFileSync(args.path, code);
})().catch(err => {
	console.error(err);
	process.exit(1);
});
