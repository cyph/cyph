#!/bin/bash

source ~/.bashrc

cd "$(cd "$(dirname "$0")"; pwd)/../../shared"

../commands/websign/pack.js websign/index.html .index.html.tmp

node -e '
	eval(fs.readFileSync("websign/js/config.js").toString());

	require("supersphincs").hash(
		Config.files.
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
