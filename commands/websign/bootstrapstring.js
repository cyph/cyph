#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import {pack} from '@cyph/sdk/cli/websign/pack.js';
import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import {updateRepos} from '../../modules/update-repos.js';

const webSignRootPath = `${__dirname}/../../websign`;

const readWebSignSubresource = (path, fromPublic = false) => {
	let content;

	if (fromPublic) {
		updateRepos();
		content = childProcess.spawnSync(
			'git',
			['show', `public:websign/${path}`],
			{
				cwd: `${os.homedir()}/.cyph/repos/internal`
			}
		).stdout;
	}
	else {
		content = fs.readFileSync(`${webSignRootPath}/${path}`);
	}

	return content.toString().trim();
};

export const bootstrapString = async (withOldServiceWorker = false) => {
	const index = await pack({
		inputPath: 'index.html',
		rootDirectoryPath: webSignRootPath
	});

	/* special case; add general solution when needed */
	const serviceWorker =
		readWebSignSubresource('lib/dexie.js', withOldServiceWorker) +
		'\n' +
		readWebSignSubresource('serviceworker.js', withOldServiceWorker);

	const files = JSON.parse(
		readWebSignSubresource('js/config.js')
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
					readWebSignSubresource(
						file === '/unsupportedbrowser' ?
							'unsupportedbrowser.html' :
							file
					))
			);
		})
		.join('\n\n\n\n\n\n');
};

if (isCLI) {
	try {
		console.log(await bootstrapString());
		process.exit(0);
	}
	catch (err) {
		console.error(err);
		process.exit(1);
	}
}
