#!/usr/bin/env node

import {program} from 'commander';

program
	.name('cyph auth')
	.description('Manage Cyph/WebSign user authentication.')
	.command('login', 'log in', {
		executableFile: 'login.js'
	})
	.command('register', 'log in', {
		executableFile: 'register.js'
	});

await program.parseAsync();
