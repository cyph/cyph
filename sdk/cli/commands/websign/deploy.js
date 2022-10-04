#!/usr/bin/env node

import {program} from 'commander';

program
	.name('cyph websign deploy')
	.arguments('<rootDirectoryPath>')
	.action(async rootDirectoryPath => {
		console.log({rootDirectoryPath});
	});

await program.parseAsync();
