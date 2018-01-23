#!/bin/bash

cd "$(cd "$(dirname "$0")" ; pwd)/../../websign"

../commands/websign/pack.js index.html .index.html.tmp

node -e '(async () => {
	const files	= JSON.parse(
		fs.readFileSync("js/config.js").toString().
			replace(/\s+/g, " ").
			replace(/.*files:\s+(\[.*?\]),.*/, "$1").
			replace(/'"'"'/g, "\"")
	);

	console.log((await require("supersphincs").hash(
		files.
			map(file => {
				return file + ":\n\n" + fs.readFileSync(
					file === "/" ?
						".index.html.tmp" :
						file === "/unsupportedbrowser" ?
							"unsupportedbrowser.html" :
							"." + file
				).toString().trim();
			}).
			join("\n\n\n\n\n\n")
	)).hex);
})().catch(err => {
	console.error(err);
	process.exit(1);
})'

rm -rf .index.html.tmp .index.html.tmp-subresources
