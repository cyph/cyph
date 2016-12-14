#!/usr/bin/env babel-node


import * as childProcess from 'child_process';
import {default as datauri} from 'datauri';
import * as fs from 'fs';
import {default as mkdirp} from 'mkdirp';
import * as superSphincs from 'supersphincs';


(async () => {


const args			= {
	subresourcePath: `${process.env.PWD}/${process.argv[2]}`
};


const filesToMerge	= childProcess.spawnSync('find', [
	'audio',
	'fonts',
	'img',
	'video',
	'-type',
	'f'
]).stdout.toString().split('\n').filter(s => s);

const filesToModify	= [
	{dir: 'css', ext: 'css'},
	{dir: 'templates', ext: 'html'},
	{dir: 'js', ext: 'js'}
].reduce((arr, o) =>
	arr.concat(
		childProcess.spawnSync('find', [
			o.dir,
			'-name',
			'*.' + o.ext,
			'-type',
			'f'
		]).stdout.toString().split('\n')
	),
	['index.html']
).filter(s => s);


await new Promise(resolve => mkdirp(args.subresourcePath, resolve));

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

			const path			= `${args.subresourcePath}/${subresource}`;
			const pathParent	= path.split('/').slice(0, -1).join('/');

			await new Promise(resolve => mkdirp(pathParent, resolve));
			fs.writeFileSync(path, dataURI);
			fs.writeFileSync(path + '.srihash', hash);
		}
	}

	if (content !== originalContent) {
		fs.writeFileSync(file, content);
	}
}


})();
