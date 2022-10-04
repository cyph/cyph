#!/usr/bin/env node

import {program} from 'commander';
import {subresourceInline} from '../../../websign/subresource-inline.js';

program
	.arguments('<subresourcePath>')
	.action(async subresourcePath => subresourceInline(subresourcePath));

await program.parseAsync();
