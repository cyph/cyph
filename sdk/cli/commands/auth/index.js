#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {__dirname} = getMeta(import.meta);

import {program} from 'commander';
import path from 'path';

program
	.name('cyph auth')
	.description('Manage Cyph/WebSign user authentication.')
	.command('login', 'log in', {
		executableFile: path.join(__dirname, 'login.js')
	})
	.command('register', 'log in', {
		executableFile: path.join(__dirname, 'register.js')
	});

await program.parseAsync();
