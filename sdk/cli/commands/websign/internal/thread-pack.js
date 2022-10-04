#!/usr/bin/env node

import {program} from 'commander';
import {threadPack} from '../../../websign/thread-pack.js';

program
	.name('cyph websign internal threadPack')
	.arguments('<rootPath>')
	.action(async rootPath => threadPack(rootPath));

await program.parseAsync();
