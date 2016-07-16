#!/usr/bin/env node

const cheerio		= require('cheerio');
const fs			= require('fs');
const superSphincs	= require('supersphincs');

const args			= {
	enableSRI: process.argv[2] === '--sri',
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
			$elem.attr('websign-sri-disable') !== undefined
		;

		const path		= $elem.attr(
			tagName === 'script' ? 'src' : 'href'
		).split('?')[0].replace(/^\//, '');

		const content	= fs.readFileSync(path).toString().
			replace(/\n\/\/# sourceMappingURL=.*?\.map/g, '').
			replace(/\n\/*# sourceMappingURL=.*?\.map *\//g, '').
			replace(/sourceMappingURL=.*?\.map/g, '').
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
			fs.writeFileSync(path, content);
		}

		$elem.replaceWith(
			tagName === 'script' ?
				(enableSRI ?
					`<script websign-sri-path='${path}' websign-sri-hash='${hash}'></script>` :
					`<script>${content.replace(/<\/script>/g, '<\\/script>')}</script>`
				) :
				(enableSRI ?
					`<link rel='stylesheet' websign-sri-path='${path}' websign-sri-hash='${hash}'></link>` :
					`<style>${content}</style>`
				)	
		);
	}

	fs.writeFileSync(args.outputPath, $.html().trim().replace(/use strict/g, ''));
}).catch(err =>
	console.error(err)
);
