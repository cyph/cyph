#!/bin/bash


dependencyModules="$(
	grep -roP "(import|from) '[@A-Za-z0-9][^' ]*';" src/js |
		grep -vP '^src/js/native/' |
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
	const fs					= require('fs');
	const glob					= require('glob');
	const {CommonsChunkPlugin}	= require('webpack').optimize;
	const config				= require('./webpack.config.js');

	const project	= JSON.parse(fs.readFileSync('package.json').toString()).name;

	const chunks	=
		'${dependencyModules}'.trim().split(/\s+/).
			filter(path =>
				(path.match(/\//g) || []).length - (path.match(/@/g) || []).length === 0
			).
			concat([
				\`./src/js/\${project}/polyfills.ts\`,
				'./src/js/cyph/services/crypto/threaded-potassium.service.ts',
				'./src/js/cyph/thread'
			]).
			map(path => ({
				path,
				name: path.replace(/\//g, '_')
			}))
	;

	const commonsChunkIndex	= config.plugins.indexOf(
		config.plugins.filter(o => o instanceof CommonsChunkPlugin)[0] || config.plugins[0]
	);

	config.plugins	= config.plugins.filter(o => !(o instanceof CommonsChunkPlugin));

	config.plugins.splice(
		commonsChunkIndex,
		undefined,
		new CommonsChunkPlugin({
			name: 'init',
			minChunks: Infinity
		})
	);

	for (const chunk of chunks.reverse()) {
		if (chunk.name in config.entry) {
			continue;
		}

		config.entry[chunk.name]	= [chunk.path];

		config.plugins.splice(
			commonsChunkIndex,
			undefined,
			new CommonsChunkPlugin({
				name: 'commons__' + chunk.name,
				chunks: ['main', chunk.name]
			})
		);
	}

	module.exports	= config;
EOM

webpack --config webpack.js
