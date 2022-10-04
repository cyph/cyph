#!/usr/bin/env node

import cheerio from 'cheerio';
import fastSHA512 from 'fast-sha512';
import fs from 'fs';
import htmlMinifier from 'html-minifier';
import mkdirp from 'mkdirp';

export const pack = async (
	dir,
	inputPath,
	enableMinify,
	enableSRI,
	outputPath
) => {
	if (enableSRI && !outputPath) {
		throw new Error('Cannot enable SRI without an output path specified.');
	}

	const subresourcePath = enableSRI ?
		`${outputPath}-subresources` :
		undefined;

	if (subresourcePath) {
		await mkdirp(subresourcePath);
	}

	if (!dir) {
		dir = '.';
	}

	const html = fs.readFileSync(`${dir}/${inputPath}`).toString();
	const $ = cheerio.load(html);

	const subresources = await Promise.all(
		Array.from(
			$('script[src], link[rel="stylesheet"][href]').map(
				async (_, elem) => {
					const $elem = $(elem);
					const tagName = $elem.prop('tagName').toLowerCase();

					const sri =
						enableSRI &&
						$elem.attr('websign-sri-disable') === undefined;
					const path = $elem
						.attr(tagName === 'script' ? 'src' : 'href')
						.split('?')[0]
						.replace(/^\//, '');

					const content = fs
						.readFileSync(`${dir}/${path}`)
						.toString()
						.replace(/\n\/\/# sourceMappingURL=.*?\.map/g, '')
						.replace(/\n\/*# sourceMappingURL=.*?\.map *\//g, '')
						.trim();
					return {
						$elem,
						content,
						sri,
						hash: (await fastSHA512.hash(content)).hex,
						path,
						tagName
					};
				}
			)
		)
	);

	for (let subresource of subresources) {
		if (subresource.sri) {
			const path = `${subresourcePath}/${subresource.path}`;
			const pathParent = path.split('/').slice(0, -1).join('/');

			await mkdirp(pathParent);
			fs.writeFileSync(`${dir}/${path}`, subresource.content);
			fs.writeFileSync(`${dir}/${path}.srihash`, subresource.hash);
		}

		subresource.$elem.replaceWith(
			subresource.tagName === 'script' ?
				subresource.sri ?
					`
					<script
						websign-sri-path='${subresource.path}'
						websign-sri-hash='${subresource.hash}'
					></script>
				` :
					`
					<script>${subresource.content.replace(/<\/script>/g, '<\\/script>')}</script>
				` :
			subresource.sri ?
				`
					<link
						rel='stylesheet'
						websign-sri-path='${subresource.path}'
						websign-sri-hash='${subresource.hash}'
					></link>
				` :
				`
					<style>${subresource.content}</style>
				`
		);
	}

	const output = (html =>
		enableMinify ?
			htmlMinifier.minify(html, {
				collapseWhitespace: true,
				minifyCSS: false,
				minifyJS: false,
				removeComments: true
			}) :
			html)($.html().trim());

	if (outputPath) {
		fs.writeFileSync(`${dir}/${outputPath}`, output);
	}

	return output;
};
