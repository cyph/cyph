#!/usr/bin/env babel-node
(async () => {


const child_process	= require('child_process');
const datauri		= require('datauri');
const fs			= require('fs');
const mkdirp		= require('mkdirp');
const superSphincs	= require('supersphincs');

const filesToMerge	= child_process.spawnSync('find', [
	'audio',
	'fonts',
	'img',
	'video',
	'-type',
	'f'
]).stdout.toString().split('\n').filter(s => s);

const filesToModify	= ['js', 'css'].reduce((arr, ext) =>
	arr.concat(
		child_process.spawnSync('find', [
			ext,
			'-name',
			'*.' + ext,
			'-type',
			'f'
		]).stdout.toString().split('\n')
	),
	['index.html']
).filter(s => s);


for (let file of filesToModify) {
	const originalContent	= fs.readFileSync(file).toString();
	let content				= originalContent;

	for (let subresource of filesToMerge) {
		if (content.indexOf(subresource) < 0) {
			continue;
		}

		const dataURI	= datauri.sync(subresource);
		const hash		= (await superSphincs.hash(dataURI)).hex;

		content	= content.
			replace(
				new RegExp(`(src|href|content)=(\\\\?['"])/?${subresource}\\\\?['"]`, 'g'),
				`websign-sri-data websign-sri-path=$2☁$2 websign-sri-hash=$2${hash}$2`
			).replace(
				new RegExp(`/?${subresource}(\\?websign-sri-disable)?`, 'g'),
				dataURI
			)
		;

		if (content.indexOf('☁') > -1) {
			content	= content.replace(/☁/g, subresource);

			const fullPath	= `${process.env.PWD}/.subresources/${subresource}`;
			mkdirp.sync(fullPath.split('/').slice(0, -1).join('/'));
			fs.writeFileSync(fullPath, dataURI);
			fs.writeFileSync(fullPath + '.srihash', hash);
		}
	}

	if (content !== originalContent) {
		fs.writeFileSync(file, content);
	}
}


})();
