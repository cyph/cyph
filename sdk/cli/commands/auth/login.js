#!/usr/bin/env node

import {program} from 'commander';
import {persistentLogin} from '../../auth/index.js';

program
	.name('cyph auth login')
	.action(async () => persistentLogin())
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
