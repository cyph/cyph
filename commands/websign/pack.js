#!/usr/bin/env node


const cheerio		= require('cheerio');
const fs			= require('fs');
const htmlMinifier	= require('html-minifier');
const mkdirp		= require('mkdirp');
const superSphincs	= require('supersphincs');


(async () => {


const args			= {
	enableSRI: process.argv.indexOf('--sri') > -1,
	enableMinify: process.argv.indexOf('--minify') > -1,
	inputPath: `${process.env.PWD}/${process.argv.slice(-2)[0]}`,
	outputPath: `${process.env.PWD}/${process.argv.slice(-1)[0]}`
};


const subresourcePath	= `${args.outputPath}-subresources`;
await new Promise(resolve => mkdirp(subresourcePath, resolve));

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
	if (subresource.enableSRI) {
		const path			= `${subresourcePath}/${subresource.path}`;
		const pathParent	= path.split('/').slice(0, -1).join('/');

		await new Promise(resolve => mkdirp(pathParent, resolve));
		fs.writeFileSync(path, subresource.content);
		fs.writeFileSync(path + '.srihash', subresource.hash);
	}

	subresource.$elem.replaceWith(
		subresource.tagName === 'script' ?
			(subresource.enableSRI ?
				`
					<script
						websign-sri-path='${subresource.path}'
						websign-sri-hash='${subresource.hash}'
					></script>
				` :
				`
					<script>${
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
					></link>
				` :
				`
					<style>${subresource.content}</style>
				`
			)	
	);
}


const output	= $.html().trim();

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


})().catch(err => {
	console.error(err);
	process.exit(1);
});
