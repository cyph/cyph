#!/bin/bash


dependencyModules="$(
	grep -roP "(import|from) '[@A-Za-z0-9][^' ]*';" src/js |
		perl -pe "s/.*?'(.*)';/\1/g" |
		sort |
		uniq |
		tr '\n' ' '
)"

node -e 'console.log(`
	/* tslint:disable */

	(<any> self).translations = ${JSON.stringify(
		require("glob").sync("../translations/*.json").map(file => ({
			key: file.split("/").slice(-1)[0].split(".")[0],
			value: JSON.parse(fs.readFileSync(file).toString())
		})).
		reduce(
			(translations, o) => {
				translations[o.key]	= o.value;
				return translations;
			},
			{}
		)
	)};
`.trim())' > src/js/standalone/translations.ts

ng eject --aot --prod --no-sourcemaps

cat > webpack.js <<- EOM
	const glob					= require('glob');
	const {CommonsChunkPlugin}	= require('webpack').optimize;
	const config				= require('./webpack.config.js');

	const chunks	=
		'${dependencyModules}'.trim().split(/\s+/).
			concat([
				'./cyph/services/crypto/threaded-potassium.service.ts',
				'./cyph/thread'
			]).
			map(path => ({
				path,
				name: path.replace(/\//g, '_')
			}))
	;

	for (const chunk of chunks) {
		if (chunk.name in config.entry) {
			continue;
		}

		config.entry[chunk.name]	= [chunk.path];

		config.plugins.push(
			new CommonsChunkPlugin({
				name: 'commons__' + chunk.name,
				chunks: ['main', chunk.name]
			})
		);
	}

	config.plugins.push(
		new CommonsChunkPlugin({
			name: 'init',
			minChunks: Infinity
		})
	);

	module.exports	= config;
EOM

webpack --config webpack.js
