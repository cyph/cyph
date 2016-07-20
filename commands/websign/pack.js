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


const writeSubresource	= (path, content) => {
	const fullPath	= `${args.outputPath}-subresources/${path}`;
	mkdirp.sync(fullPath.split('/').slice(0, -1).join('/'));

	fs.writeFileSync(
		fullPath,
		content
	);
};

const processDataSRI	= content => Promise.all((content.match(
	/WEBSIGN-SRI-DATA-START☁.*?☁data:.*?☁WEBSIGN-SRI-DATA-END/g
) || []).map(match => {
	const matchSplit	= match.split('☁');
	const matchPath		= matchSplit[1];
	const matchData		= matchSplit[2];

	writeSubresource(matchPath, matchData);

	return superSphincs.hash(matchData).then(hash => ({
		fullMatch: match,
		path: matchPath,
		hash: hash.hex
	}));
})).then(results => results.reduce(
	(newContent, result) => newContent.replace(
		result.fullMatch,
		`websign-sri-data ` +
			`websign-sri-path='${result.path}' ` +
			`websign-sri-hash='${result.hash}'`
	),
	content
));


Promise.resolve().then(() => {
	const html	= fs.readFileSync(args.inputPath).toString();

	if (args.enableSRI) {
		return processDataSRI(html);
	}

	return html;
}).then(html => {
	const $	= cheerio.load(html);

	return Promise.all([$, Promise.all(Array.from(
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
	))]);
}).then(results => {
	const $				= results[0];
	const subresources	= results[1];

	for (const subresource of subresources) {
		const $elem		= subresource[0];
		const tagName	= subresource[1];
		const enableSRI	= subresource[2];
		const path		= subresource[3];
		const content	= subresource[4];
		const hash		= subresource[5].hex;

		const specialAttributes	= [
			'websign-sri-include'
		].map(s =>
			$elem.attr(s) === undefined ? '' : s
		).join(' ');

		if (enableSRI) {
			processDataSRI(content).then(newContent => writeSubresource(
				path,
				newContent
			));
		}

		$elem.replaceWith(
			tagName === 'script' ?
				(enableSRI ?
					`
						<script
							websign-sri-path='${path}'
							websign-sri-hash='${hash}'
							${specialAttributes}
						></script>
					` :
					`
						<script ${specialAttributes}>${
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
							${specialAttributes}
						></link>
					` :
					`
						<style ${specialAttributes}>${content}</style>
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
				minifyCSS: true,
				minifyJS: true,
				removeComments: true
			}) :
			output
	);
}).catch(err =>
	console.error(err)
);
