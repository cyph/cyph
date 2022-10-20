#!/usr/bin/env node

import {program} from 'commander';
import {pack} from '../../../websign/pack.js';

program
	.name('cyph websign internal pack')
	.arguments('<inputPath> <outputPath>')
	.option('--minify', 'minify output')
	.option('--sri', 'split out subresources with integrity verification')
	.action(
		async (
			inputPath,
			outputPath,
			{minify: enableMinify = false, sri: enableSRI = false}
		) => pack(process.cwd(), inputPath, enableMinify, enableSRI, outputPath)
	);

await program.parseAsync();
