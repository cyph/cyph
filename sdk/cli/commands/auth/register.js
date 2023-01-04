#!/usr/bin/env node

import {program} from 'commander';
import {register} from '../../auth/index.js';

program
	.name('cyph auth register')
	.action(async () => register())
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
