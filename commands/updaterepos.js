#!/usr/bin/env node

import {updateRepos} from '../modules/update-repos.js';

updateRepos()
	.then(() => {
		process.exit(0);
	})
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
