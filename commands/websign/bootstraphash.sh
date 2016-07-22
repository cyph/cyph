#!/bin/bash

source ~/.bashrc

cd "$(cd "$(dirname "$0")"; pwd)/../../shared"

../commands/websign/pack.js websign/index.html .index.html.tmp

node -e '
	const files	= JSON.parse(
		fs.readFileSync("websign/js/config.js").toString().
			replace(/\s+/g, " ").
			replace(/.*files:\s+(\[.*?\]),.*/, "$1").
			replace(/'"'"'/g, "\"")
	);

	require("supersphincs").hash(
		files.
			map(file => {
				return file + ":\n\n" + fs.readFileSync(
					file === "./" ?
						".index.html.tmp" :
						file === "serviceworker.js" ?
							"websign/serviceworker.js" :
							file === "unsupportedbrowser" ?
								"websign/unsupportedbrowser.html" :
								file
				).toString().trim();
			}).
			join("\n\n\n\n\n\n")
	).then(hash =>
		console.log(hash.hex)
	);
'

rm .index.html.tmp
