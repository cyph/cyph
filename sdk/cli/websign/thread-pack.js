#!/usr/bin/env node

import fs from 'fs';
import {minify} from 'terser';

const varToSelfReplacements = new Set([
	'assets/node_modules/openpgp/dist/openpgp.min.js'
]);

export const threadPack = async rootPath => {
	const originalCode = fs.readFileSync(rootPath).toString();

	const modifiedCode = originalCode.replace(
		/importScripts\(\s*["'](.*?)["']\s*\)/g,
		(_, value) => {
			const scriptPath = value
				.slice(value[0] === '/' ? 1 : 0)
				.split('?')[0];

			let content =
				'\n\n' + fs.readFileSync(scriptPath).toString() + '\n\n';

			if (varToSelfReplacements.has(scriptPath)) {
				content = content.replace(/(^|\n)var /, '$1self.');
			}

			return content;
		}
	);

	if (originalCode !== modifiedCode) {
		const {error} = minify(modifiedCode);

		if (error) {
			fs.appendFileSync(
				'/cyph/threadpack.log',
				`${rootPath}:\n\n${modifiedCode}\n\n\n\n\n\n\n\n`
			);
			throw error;
		}

		fs.writeFileSync(rootPath, modifiedCode);
	}
};
