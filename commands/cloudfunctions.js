#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import fs from 'fs';
import memoize from 'lodash-es/memoize.js';

export const cloudFunctions = memoize(() =>
	Array.from(
		new Set(
			fs
				.readFileSync(__dirname + '/../firebase/functions/index.js')
				.toString()
				.replace(/\/\*(.|\n)*?\*\//g, '')
				.split('\n')
				.map(s => s.replace(/^(exports\.(.*?) |.*).*?$/, '$2'))
				.filter(s => s)
		)
	).sort()
);

if (isCLI) {
	const output = cloudFunctions().join('\n');

	if (process.argv[2]) {
		fs.writeFileSync(process.argv[2], output);
	}
	else {
		console.log(output);
	}

	process.exit(0);
}
