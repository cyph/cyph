#!/usr/bin/env node

import fs from 'fs/promises';
import {globSync as glob} from 'glob';
import minimist from 'minimist';
import path from 'path';
import {publishSubresources} from '../../modules/websign-subresources.js';

try {
	const {
		'custom-builds': customBuilds,
		'package-name': packageName,
		'packages-root': packagesRoot,
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

	if (typeof packagesRoot !== 'string') {
		throw new Error(
			'Packages root directory (--packages-root <packagesRoot>) not specified.'
		);
	}

	const subresourcesRoot = path.join(packagesRoot, packageName);

	const subresources = Object.fromEntries(
		await Promise.all(
			glob('**', {
				cwd: subresourcesRoot,
				ignore: ['.index.html', '**/*.srihash'],
				nodir: true
			}).map(async k => [
				k,
				await fs.readFile(path.join(subresourcesRoot, k))
			])
		)
	);

	const customBuildData = Object.fromEntries(
		await Promise.all(
			customBuilds
				?.trim()
				.split(/\s+/)
				.filter(s => !!s)
				.map(async customBuild => [
					customBuild,
					Object.fromEntries(
						await Promise.all(
							['current', 'pkg', 'pkg.v2'].map(async k => [
								k,
								await fs.readFile(
									path.join(
										path.join(packagesRoot, customBuild, k)
									)
								)
							])
						)
					)
				]) ?? []
		)
	);

	await publishSubresources({
		customBuilds: customBuildData,
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
