#!/usr/bin/env node


const childProcess	= require('child_process');
const fs			= require('fs');
const glob			= require('glob');
const mkdirp		= require('mkdirp');
const superSphincs	= require('supersphincs');


(async () => {


const filesToCacheBust	= glob.sync('*', {nodir: true}).concat(
	glob.sync('assets/**', {nodir: true})
);

const filesToModify		= glob.sync('**', {nodir: true}).filter(path =>
	path.endsWith('.html') || path.endsWith('.js')
);

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


})();
