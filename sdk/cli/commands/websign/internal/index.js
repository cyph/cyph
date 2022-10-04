#!/usr/bin/env node

import {program} from 'commander';

program
	.name('cyph websign internal')
	.description('Extra/internal commands (long-term support not guaranteed).')
	.command('pack', 'Compile web assets into WebSign-compatible package.', {
		executableFile: 'pack.js'
	})
	.command('subresourceInline', 'Inline all subresources into package.', {
		executableFile: 'subresource-inline.js'
	})
	.command('threadPack', 'Bundle imported scripts into threads.', {
		executableFile: 'thread-pack.js'
	});

await program.parseAsync();
