#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {__dirname} = getMeta(import.meta);

import {program} from 'commander';
import path from 'path';

program
	.name('cyph websign')
	.description('Use WebSign service.')
	.command('deploy', 'deploy new release', {
		executableFile: path.join(__dirname, 'deploy.js')
	})
	.command('internal', 'additional helpers for non-standard scenarios', {
		executableFile: path.join(__dirname, 'internal', 'index.js')
	});

await program.parseAsync();
