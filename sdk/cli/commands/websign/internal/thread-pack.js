#!/usr/bin/env node

import {program} from 'commander';
import {threadPack} from '../../../websign/thread-pack.js';

program
	.name('websign internal threadPack')
	.arguments('<rootPath>')
	.action(async rootPath => threadPack(rootPath))
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
