#!/usr/bin/env node

import {getMeta} from './modules/base.js';
const {__dirname} = getMeta(import.meta);

import {program} from 'commander';
import path from 'path';

program
	.name('cyph')
	.command('auth', 'manage user authentication', {
		executableFile: path.join(__dirname, 'commands', 'auth', 'index.js')
	})
	.command('websign', 'use WebSign service', {
		executableFile: path.join(__dirname, 'commands', 'websign', 'index.js')
	});

await program.parseAsync();
