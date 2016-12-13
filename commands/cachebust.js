#!/usr/bin/env node

const superSphincs		= require("supersphincs");

const filesToCacheBust	= child_process.spawnSync("find", [
	"-L",
	".",
	"-type",
	"f",
	"-mindepth",
	"2"
]).stdout.toString().split("\n").filter(s => s).map(s => s.slice(2));

const filesToModify		= child_process.spawnSync("find", [
	".",
	"-type",
	"f",
	"-and",
	"\(",
	"-name",
	"*.html",
	"-or",
	"-name",
	"*.js",
	"-or",
	"-name",
	"*.css",
	"\)"
]).stdout.toString().split("\n").filter(s => s);

const fileContents		= {};
const cacheBustedFiles	= {};

const getFileName		= file => file.split("/").slice(-1)[0];


Promise.all(filesToModify.map(file =>
	new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
		try {
			fileContents[file]	= data.toString();
			resolve();
		}
		catch (_) {
			reject(err);
		}
	})).then(() =>
		filesToCacheBust.reduce((p, subresource) => p.then(content => {
			if (content.indexOf(subresource) < 0) {
				return content;
			}

			cacheBustedFiles[getFileName(subresource)]	= true;

			return superSphincs.hash(
				fs.readFileSync(subresource)
			).then(hash =>
				content.split(subresource).join(`${subresource}?${hash.hex}`)
			);
		}), Promise.resolve(fileContents[file])).then(content => {
			if (content !== fileContents[file]) {
				fileContents[file]	= content;
				fs.writeFileSync(file, content);
			}
		})
	)
)).

/* To save space, remove unused subresources under lib directory */
then(() => Promise.all(
	filesToCacheBust.filter(subresource =>
		subresource.startsWith("lib/") &&
		!cacheBustedFiles[getFileName(subresource)]
	).map(subresource => new Promise(resolve =>
		fs.unlink(subresource, resolve)
	))
));
