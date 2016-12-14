#!/usr/bin/env babel-node


import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as htmlMinifier from 'html-minifier';
import * as mkdirp from 'mkdirp';
import * as superSphincs from 'supersphincs';


(async () => {


const args			= {
	enableSRI: process.argv.indexOf('--sri') > -1,
	enableMinify: process.argv.indexOf('--minify') > -1,
	inputPath: `${process.env.PWD}/process.argv.slice(-2)[0]`,
	outputPath: `${process.env.PWD}/process.argv.slice(-1)[0]`
};


const subresourcePath	= `${args.outputPath}-subresources`;

mkdirp.sync(args.outputPath);
mkdirp.sync(subresourcePath);

const html	= fs.readFileSync(args.inputPath).toString();
const $		= cheerio.load(html);

const subresources	= await Promise.all(Array.from(
	$('script[src], link[rel="stylesheet"][href]').map(async (_, elem) => {
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

		return {
			$elem,
			tagName,
			enableSRI,
			path,
			content,
			hash: (await superSphincs.hash(content)).hex
		};
	})
));

for (let subresource of subresources) {
	const specialAttributes	= [
		'websign-sri-include'
	].map(s =>
		subresource.$elem.attr(s) === undefined ? '' : s
	).join(' ');

	if (subresource.enableSRI) {
		const fullPath	= `${subresourcePath}/${subresource.path}`;
		mkdirp.sync(fullPath.split('/').slice(0, -1).join('/'));
		fs.writeFileSync(fullPath, subresource.content);
		fs.writeFileSync(fullPath + '.srihash', subresource.hash);
	}

	subresource.$elem.replaceWith(
		subresource.tagName === 'script' ?
			(subresource.enableSRI ?
				`
					<script
						websign-sri-path='${subresource.path}'
						websign-sri-hash='${subresource.hash}'
						${specialAttributes}
					></script>
				` :
				`
					<script ${specialAttributes}>${
						subresource.content.replace(/<\/script>/g, '<\\/script>')
					}</script>
				`
			) :
			(subresource.enableSRI ?
				`
					<link
						rel='stylesheet'
						websign-sri-path='${subresource.path}'
						websign-sri-hash='${subresource.hash}'
						${specialAttributes}
					></link>
				` :
				`
					<style ${specialAttributes}>${subresource.content}</style>
				`
			)	
	);
}


const output	= $.html().trim().replace(/use strict/g, '');

fs.writeFileSync(
	args.outputPath,
	args.enableMinify ?
		htmlMinifier.minify(output, {
			collapseWhitespace: true,
			minifyCSS: false,
			minifyJS: false,
			removeComments: true
		}) :
		output
);


})();
