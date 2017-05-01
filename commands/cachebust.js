#!/usr/bin/env node


const childProcess	= require('child_process');
const fs			= require('fs');
const mkdirp		= require('mkdirp');
const superSphincs	= require('supersphincs');


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
	'-not',
	'-path',
	'./lib/*',
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

		cacheBustedFiles[subresource]	= true;

		const hash	= (await superSphincs.hash(fs.readFileSync(subresource))).hex;
		content		= content.split(subresource).join(`${subresource}?${hash}`);
	}

	if (content !== fileContents[file]) {
		fileContents[file]	= content;
		fs.writeFileSync(file, content);
	}
}


const localModulesPath	= 'lib/js/node_modules';
const globalModulesPath	= '/node_modules';

fs.unlinkSync(localModulesPath);

for (let subresource of filesToCacheBust.filter(subresource =>
	subresource.startsWith(`${localModulesPath}/`) &&
	cacheBustedFiles[subresource]
)) {
	mkdirp.sync(subresource.split('/').slice(0, -1).join('/'));
	childProcess.spawnSync('cp', [
		subresource.replace(new RegExp(`^${localModulesPath}`), globalModulesPath),
		subresource
	]);
}


})();
