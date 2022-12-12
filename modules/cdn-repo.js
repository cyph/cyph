#!/usr/bin/env node

import fs from 'fs/promises';
import memoize from 'lodash-es/memoize.js';
import os from 'os';
import path from 'path';
import {GitRepo} from './git.js';

const cyphPath = path.join(os.homedir(), '.cyph');

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
		url: 'git@github.com:cyph/cdn.git'
	});
});
