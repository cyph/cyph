#!/usr/bin/env node

import {getMeta} from '../../../modules/base.js';
const {__dirname} = getMeta(import.meta);

import {program} from 'commander';
import path from 'path';

program
	.name('websign internal')
	.description('Extra/internal commands (long-term support not guaranteed).')
	.command('pack', 'Compile web assets into WebSign-compatible package.', {
		executableFile: path.join(__dirname, 'pack.js')
	})
	.command('subresourceInline', 'Inline all subresources into package.', {
		executableFile: path.join(__dirname, 'subresource-inline.js')
	})
	.command('threadPack', 'Bundle imported scripts into threads.', {
		executableFile: path.join(__dirname, 'thread-pack.js')
	});

await program.parseAsync();
