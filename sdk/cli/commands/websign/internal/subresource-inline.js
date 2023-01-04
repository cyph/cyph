#!/usr/bin/env node

import {program} from 'commander';
import {subresourceInline} from '../../../websign/subresource-inline.js';

program
	.name('cyph websign internal subresourceInline')
	.arguments('<subresourcePath>')
	.action(async subresourcePath =>
		subresourceInline(process.cwd(), subresourcePath)
	)
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
