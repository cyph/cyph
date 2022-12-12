#!/usr/bin/env node

import fs from 'fs/promises';
import glob from 'glob/sync.js';
import minimist from 'minimist';
import path from 'path';
import {publishSubresources} from '../../modules/websign-subresources.js';

try {
	const {
		'custom-builds': customBuilds,
		'package-name': packageName,
		'subresources-root': subresourcesRoot,
		test = false
	} = minimist(process.argv.slice(2));

	if (
		typeof packageName !== 'string' ||
		!packageName.includes('.') ||
		new URL(`https://${packageName}`).host !== packageName
	) {
		throw new Error(
			'Package name (--package-name <packageName>) not specified.'
		);
	}

	const subresources = subresourcesRoot ?
		Object.fromEntries(
			await Promise.all(
				glob('**', {cwd: subresourcesRoot, nodir: true})
					.filter(k => !k.endsWith('.srihash'))
					.map(async k => [
						k,
						(
							await fs.readFile(path.join(subresourcesRoot, k))
						).toString()
					])
			)
		) :
		{};

	await publishSubresources({
		customBuilds: customBuilds?.trim().split(/\s+/) ?? [],
		packageName,
		subresources,
		test
	});

	console.log('WebSign subresource publication complete.');
	process.exit(0);
}
catch (err) {
	console.error(err);
	console.log('WebSign subresource publication failed.');
	process.exit(1);
}
