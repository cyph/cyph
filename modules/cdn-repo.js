#!/usr/bin/env node

import {getMeta} from './base.js';
const {__dirname} = getMeta(import.meta);

import fs from 'fs/promises';
import memoize from 'lodash-es/memoize.js';
import os from 'os';
import path from 'path';
import {GitRepo} from './git.js';

const cyphPath = path.join(os.homedir(), '.cyph');

const gitHubToken = (async () => {
	for (const gitHubTokenPath of [
		`${__dirname}/github.token`,
		`${os.homedir()}/.cyph/github.token`
	]) {
		try {
			return (await fs.readFile(gitHubTokenPath)).toString().trim();
		}
		catch {}
	}

	throw new Error('GitHub token not found.');
})();

export const getCDNRepo = memoize(async () => {
	const cyphPathExists = await fs
		.access(cyphPath)
		.then(() => true)
		.catch(() => false);

	const repoPath = cyphPathExists ?
		path.join(cyphPath, 'repos', 'cdn') :
		undefined;

	return new GitRepo({
		repoPath,
		url: `https://${await gitHubToken}:x-oauth-basic@github.com/cyph/cdn.git`
	});
});
