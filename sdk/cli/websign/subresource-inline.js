#!/usr/bin/env node

import datauri from 'datauri/sync.js';
import fastSHA512 from 'fast-sha512';
import fs from 'fs';
import {glob} from 'glob';
import {mkdirp} from 'mkdirp';
import path from 'path';

export const subresourceInline = async (rootDirectoryPath, subresourceRoot) => {
	subresourceRoot = path.join(rootDirectoryPath, subresourceRoot);

	const filesToMerge = (
		await glob(path.join(rootDirectoryPath, 'assets', '**'), {
			ignore: ['css', 'js', 'misc', 'node_modules'].map(dir =>
				path.join(rootDirectoryPath, 'assets', dir, '**')
			),
			nodir: true
		})
	).map(file =>
		rootDirectoryPath ? file.slice(rootDirectoryPath.length + 1) : file
	);

	const filesToModify = (
		await Promise.all(
			[
				{dir: 'assets/css', ext: 'css'},
				{dir: 'assets/js', ext: 'js'},
				{dir: 'css', ext: 'scss'},
				{dir: 'js', ext: 'html'},
				{dir: 'js', ext: 'scss'},
				{dir: 'js', ext: 'ts'}
			].map(async o =>
				glob(path.join(rootDirectoryPath, o.dir, '**', `*.${o.ext}`), {
					nodir: true
				})
			)
		)
	).reduce(
		(a, b) => a.concat(b),
		[path.join(rootDirectoryPath, 'index.html')]
	);

	await mkdirp(subresourceRoot);

	for (let file of filesToModify) {
		const originalContent = fs.readFileSync(file).toString();
		let content = originalContent;

		for (let subresource of filesToMerge) {
			if (content.indexOf(subresource) < 0) {
				continue;
			}

			const subresourceInputPath = path.join(
				rootDirectoryPath,
				subresource
			);

			const dataURI = datauri(subresourceInputPath).content;
			const hash = (await fastSHA512.hash(dataURI)).hex;

			content = content
				.replace(
					new RegExp(
						`(src|href|content)=(\\\\?['"])/?${subresource}\\\\?['"]`,
						'g'
					),
					`websign-sri-data websign-sri-path=$2☁$2 websign-sri-hash=$2${hash}$2`
				)
				.replace(
					new RegExp(
						`/?${subresource}(\\?websign-sri-disable)?`,
						'g'
					),
					dataURI
				);

			if (content.indexOf('☁') > -1) {
				content = content.replace(/☁/g, subresource);

				const subresourcePath = path.join(subresourceRoot, subresource);
				const subresourcePathParent = path.parse(subresourcePath).dir;

				await mkdirp(subresourcePathParent);
				fs.writeFileSync(subresourcePath, dataURI);
				fs.writeFileSync(`${subresourcePath}.srihash`, hash);
			}
		}

		if (content !== originalContent) {
			fs.writeFileSync(file, content);
		}
	}
};
