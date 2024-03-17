#!/usr/bin/env node

import {updateRepos} from '../modules/update-repos.js';

try {
	updateRepos();
	process.exit(0);
}
catch (err) {
	console.error(err);
	process.exit(1);
}
