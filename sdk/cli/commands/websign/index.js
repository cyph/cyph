#!/usr/bin/env node

import {program} from 'commander';

program
	.name('cyph websign')
	.description('Use WebSign service.')
	.command('deploy', 'deploy new release', {
		executableFile: 'deploy.js'
	})
	.command('internal', 'additional helpers for non-standard scenarios', {
		executableFile: 'internal/index.js'
	});

await program.parseAsync();
