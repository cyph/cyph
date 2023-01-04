#!/usr/bin/env node

import {program} from 'commander';
import {login} from '../../auth/index.js';

program
	.name('cyph auth login')
	.action(async () => login())
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
