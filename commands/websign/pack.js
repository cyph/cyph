#!/usr/bin/env node

const cheerio		= require('cheerio');
const fs			= require('fs');
const mkdirp		= require('mkdirp');
const htmlMinifier	= require('html-minifier');
const superSphincs	= require('supersphincs');

const args			= {
	enableSRI: process.argv.indexOf('--sri') > -1,
	enableMinify: process.argv.indexOf('--minify') > -1,
	inputPath: process.argv.slice(-2)[0],
	outputPath: process.argv.slice(-1)[0] 
};


const $	= cheerio.load(fs.readFileSync(args.inputPath).toString());

Promise.all(Array.from(
	$('script[src], link[rel="stylesheet"][href]').map((_, elem) => {
		const $elem		= $(elem);
		const tagName	= $elem.prop('tagName').toLowerCase();

		const enableSRI	=
			args.enableSRI &&
			$elem.attr('websign-sri-disable') === undefined
		;

		const path		= $elem.attr(
			tagName === 'script' ? 'src' : 'href'
		).split('?')[0].replace(/^\//, '');

		const content	= fs.readFileSync(path).toString().
			replace(/\n\/\/# sourceMappingURL=.*?\.map/g, '').
			replace(/\n\/*# sourceMappingURL=.*?\.map *\//g, '').
			trim()
		;

		return Promise.all([
			$elem,
			tagName,
			enableSRI,
			path,
			content,
			superSphincs.hash(content)
		]);
	})
)).then(results => {
	for (const result of results) {
		const $elem		= result[0];
		const tagName	= result[1];
		const enableSRI	= result[2];
		const path		= result[3];
		const content	= result[4];
		const hash		= result[5].hex;

		if (enableSRI) {
			const newPath	= `${args.outputPath}-subresources/${path}`; 
			mkdirp.sync(newPath.split('/').slice(0, -1).join('/'));
			fs.writeFileSync(newPath, content);
		}

		$elem.replaceWith(
			tagName === 'script' ?
				(enableSRI ?
					`
						<script
							websign-sri-path='${path}'
							websign-sri-hash='${hash}'
						></script>
					` :
					`
						<script>${
							content.replace(/<\/script>/g, '<\\/script>')
						}</script>
					`
				) :
				(enableSRI ?
					`
						<link
							rel='stylesheet'
							websign-sri-path='${path}'
							websign-sri-hash='${hash}'
						></link>
					` :
					`
						<style>${content}</style>
					`
				)	
		);
	}

	const output	= $.html().trim().replace(/use strict/g, '');

	fs.writeFileSync(args.outputPath,
		args.enableMinify ?
			htmlMinifier.minify(output, {
				collapseWhitespace: true,
				minifyCSS: true,
				minifyJS: true,
				removeComments: true
			}) :
			output
	);
}).catch(err =>
	console.error(err)
);
