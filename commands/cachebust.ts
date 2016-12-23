#!/usr/bin/env ts-node


import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as superSphincs from 'supersphincs';


(async () => {


const filesToCacheBust	= childProcess.spawnSync('find', [
	'-L',
	'.',
	'-type',
	'f',
	'-mindepth',
	'2'
]).stdout.toString().split('\n').filter(s => s).map(s => s.slice(2));

const filesToModify		= childProcess.spawnSync('find', [
	'.',
	'-type',
	'f',
	'-and',
	'\(',
	'-name',
	'*.html',
	'-or',
	'-name',
	'*.js',
	'-or',
	'-name',
	'*.css',
	'\)'
]).stdout.toString().split('\n').filter(s => s);

const fileContents		= {};
const cacheBustedFiles	= {};

const getFileName		= file => file.split('/').slice(-1)[0];


for (let file of filesToModify) {
	await new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
		try {
			fileContents[file]	= data.toString();
			resolve();
		}
		catch (_) {
			reject(err);
		}
	}));

	let content	= fileContents[file];

	for (let subresource of filesToCacheBust) {
		if (content.indexOf(subresource) < 0) {
			continue;
		}

		cacheBustedFiles[getFileName(subresource)]	= true;

		const hash	= (await superSphincs.hash(fs.readFileSync(subresource))).hex;
		content		= content.split(subresource).join(`${subresource}?${hash}`);
	}

	if (content !== fileContents[file]) {
		fileContents[file]	= content;
		fs.writeFileSync(file, content);
	}
}

/* To save space, remove unused subresources under lib directory */
for (let subresource of filesToCacheBust.filter(subresource =>
	subresource.startsWith('lib/') &&
	!cacheBustedFiles[getFileName(subresource)]
)) {
	fs.unlink(subresource);
}


})();
