#!/usr/bin/env node

const datauri		= require("datauri");

const filesToMerge	= child_process.spawnSync("find", [
	"audio",
	"fonts",
	"img",
	"video",
	"-type",
	"f"
]).stdout.toString().split("\n").filter(s => s);

const filesToModify	= ["js", "css"].reduce((arr, ext) =>
	arr.concat(
		child_process.spawnSync("find", [
			ext,
			"-name",
			"*." + ext,
			"-type",
			"f"
		]).stdout.toString().split("\n")
	),
	["index.html"]
).filter(s => s);


for (let file of filesToModify) {
	const originalContent	= fs.readFileSync(file).toString();
	let content				= originalContent;

	for (let subresource of filesToMerge) {
		if (content.indexOf(subresource) < 0) {
			continue;
		}

		const dataURI	= datauri.sync(subresource);

		content	= content.
			replace(
				new RegExp(`(src|href|content)=(\\\\?['"'"'"])/?${subresource}\\\\?['"'"'"]`, "g"),
				`WEBSIGN-SRI-DATA-START☁$2☁☁☁${dataURI}☁WEBSIGN-SRI-DATA-END`
			).replace(
				new RegExp(`/?${subresource}(\\?websign-sri-disable)?`, "g"),
				dataURI
			).replace(
				/☁☁☁/g,
				`☁${subresource}☁`
			)
		;
	}

	if (content !== originalContent) {
		fs.writeFileSync(file, content);
	}
}
