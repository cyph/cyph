#!/usr/bin/env node


const childProcess	= require('child_process');
const datauri		= require('datauri');
const fs			= require('fs');
const glob			= require('glob');
const mkdirp		= require('mkdirp');
const superSphincs	= require('supersphincs');


(async () => {


const args			= {
	subresourcePath: `${process.env.PWD}/${process.argv.slice(-1)[0]}`
};


process.chdir('src');


const filesToMerge	= glob.sync('assets/**', {nodir: true}).
	filter(s => !s.match(/^assets\/(css|js|node_modules)\//))
;

const filesToModify	= [
	{dir: 'assets/css', ext: 'css'},
	{dir: 'assets/js', ext: 'js'},
	{dir: 'css', ext: 'scss'},
	{dir: 'js', ext: 'ts'},
	{dir: 'templates', ext: 'html'}
].map(o =>
	glob.sync(`${o.dir}/**`, {nodir: true}).filter(s => s.endsWith(`.${o.ext}`))
).reduce((a, b) =>
	a.concat(b),
	['index.html']
);


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
