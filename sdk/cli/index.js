#!/usr/bin/env node

import {program} from 'commander';

program
	.name('cyph')
	.command('auth', 'manage user authentication', {
		executableFile: 'commands/auth/index.js'
	})
	.command('websign', 'use WebSign service', {
		executableFile: 'commands/websign/index.js'
	});

await program.parseAsync();
