#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {pack} from '@cyph/sdk/cli/websign/pack.js';
import fs from 'fs';

export const bootstrapString = async () => {
	const path = `${__dirname}/../../websign`;

	const index = await pack({
		inputPath: 'index.html',
		rootDirectoryPath: path
	});

	/* special case; add general solution when needed */
	const serviceWorker =
		fs.readFileSync(`${path}/lib/dexie.js`).toString().trim() +
		'\n' +
		fs.readFileSync(`${path}/serviceworker.js`).toString().trim();

	const files = JSON.parse(
		fs
			.readFileSync(`${path}/js/config.js`)
			.toString()
			.replace(/\s+/g, ' ')
			.replace(/.*files:\s+(\[.*?\]),.*/, '$1')
			.replace(/'/g, '"')
	);

	return files
		.map(file => {
			return (
				file +
				':\n\n' +
				(file === '/' ?
					index :
				file === '/serviceworker.js' ?
					serviceWorker :
					fs
						.readFileSync(
							`${path}/${
								file === '/unsupportedbrowser' ?
									'unsupportedbrowser.html' :
									file
							}`
						)
						.toString()
						.trim())
			);
		})
		.join('\n\n\n\n\n\n');
};

if (isCLI) {
	bootstrapString()
		.then(content => {
			console.log(content);
			process.exit(0);
		})
		.catch(err => {
			console.error(err);
			process.exit(1);
		});
}
