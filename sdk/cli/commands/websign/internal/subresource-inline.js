#!/usr/bin/env node

import {program} from 'commander';
import {subresourceInline} from '../../../websign/subresource-inline.js';

program
	.name('cyph websign internal subresourceInline')
	.arguments('<subresourcePath>')
	.action(async subresourcePath => subresourceInline(subresourcePath));

await program.parseAsync();
