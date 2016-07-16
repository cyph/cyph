#!/usr/bin/env node

const cheerio		= require('cheerio');
const fs			= require('fs');
const superSphincs	= require('supersphincs');

const args			= {
	webSignSRI: process.argv[2] === '--webSignSRI',
	inputPath: process.argv.slice(-2)[0],
	outputPath: process.argv.slice(-1)[0] 
};


const $	= cheerio.load(fs.readFileSync(args.inputPath).toString());

Promise.all(Array.from(
	$('script[src], link[rel="stylesheet"][href]').map((_, elem) => {
		const $elem		= $(elem);
		const tagName	= $elem.prop('tagName').toLowerCase();

		const path		= $elem.attr(
			tagName === 'script' ? 'src' : 'href'
		).split('?')[0];

		const content	= fs.readFileSync(path).toString().
			replace(/\n\/\/# sourceMappingURL=.*?\.map/g, '').
			replace(/\n\/*# sourceMappingURL=.*?\.map *\//g, '').
			replace(/sourceMappingURL=.*?\.map/g, '').
			trim()
		;

		return Promise.all([
			$elem,
			tagName,
			path,
			content,
			superSphincs.hash(content)
		]);
	})
)).then(results => {
	for (const result of results) {
		const $elem		= result[0];
		const tagName	= result[1];
		const path		= result[2];
		const content	= result[3];
		const hash		= result[4].hex;

		if (args.webSignSRI) {
			fs.writeFileSync(path, content);
		}

		$elem.replaceWith(
			tagName === 'script' ?
				(args.webSignSRI ?
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
				(args.webSignSRI ?
					`
						<link
							rel='stylesheet'
							websign-sri-path='${path}'
							websign-sri-hash='${hash}'
						></link>
					` :
					`<style>${content}</style>`
				)	
		);
	}

	fs.writeFileSync(args.outputPath, $.html().trim());
}).catch(err =>
	console.error(err)
);
