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
	const ExtractTextPlugin						= require('extract-text-webpack-plugin');
	const HtmlWebpackPlugin						= require('html-webpack-plugin');
	const path									= require('path');
	const {CommonsChunkPlugin, UglifyJsPlugin}	= require('webpack').optimize;
	const config								= require('./webpack.config.js');

	const chunks	=
		'${dependencyModules}'.
			trim().
			split(/\s+/).
			map(s => path.join('node_modules', s)).
			concat([
				'src/js/cyph/thread',
				'src/js/cyph/services/crypto/threaded-potassium.service',
				'src/js/cyph/services',
				'src/js/cyph/components',
				'src/js/cyph'
			]).
			map(s => ({
				name: 'commons__' + s.replace(/\//g, '_'),
				path: s
			}))
	;

	const entryPoints	= ['inline', 'polyfills', 'sw-register', 'styles'].
		concat(chunks.map(chunk => chunk.name)).
		concat(['vendor', 'main'])
	;

	const mangleExcept	= '$(
		grep -oP '[A-Za-z_\$][A-Za-z0-9_\$]*' src/assets/js/standalone/global.js |
		sort |
		uniq |
		tr '\n' ' '
	)'.
		trim().
		split(/\s+/)
	;

	const commonsChunkIndex	= config.plugins.indexOf(
		config.plugins.find(o => o instanceof CommonsChunkPlugin)
	);

	for (const chunk of chunks.reverse()) {
		config.plugins.splice(
			commonsChunkIndex + 1,
			undefined,
			new CommonsChunkPlugin({
				name: chunk.name,
				chunks: ['main'],
				minChunks: o => o.resource && o.resource.startsWith(
					path.join(process.cwd(), chunk.path)
				)
			})
		);
	}

	const extractTextIndex	= config.plugins.indexOf(
		config.plugins.find(o => o instanceof ExtractTextPlugin)
	);

	if (extractTextIndex > -1) {
		config.plugins.splice(
			extractTextIndex,
			1,
			new ExtractTextPlugin({
				filename: '[name].css'
			})
		);
	}

	const htmlWebpackIndex	= config.plugins.indexOf(
		config.plugins.find(o => o instanceof HtmlWebpackPlugin)
	);

	if (htmlWebpackIndex > -1) {
		config.plugins.splice(
			htmlWebpackIndex,
			1,
			new HtmlWebpackPlugin({
				template: './src/index.html',
				filename: './index.html',
				hash: false,
				inject: true,
				compile: true,
				favicon: false,
				minify: false,
				cache: true,
				showErrors: true,
				chunks: 'all',
				xhtml: true,
				chunksSortMode: (left, right) => {
					let leftIndex	= entryPoints.indexOf(left.names[0]);
					let rightindex	= entryPoints.indexOf(right.names[0]);

					if (leftIndex > rightindex) {
						return 1;
					}
					else if (leftIndex < rightindex) {
						return -1;
					}
					else {
						return 0;
					}
				}
			})
		);
	}

	const uglifyJsIndex	= config.plugins.indexOf(
		config.plugins.find(o => o instanceof UglifyJsPlugin)
	);

	if (uglifyJsIndex > -1) {
		config.plugins.splice(
			uglifyJsIndex,
			1,
			new UglifyJsPlugin({
				comments: false,
				compress: {
					'screw_ie8': true,
					'sequences': false,
					'warnings': false
				},
				mangle: {
					'except': mangleExcept,
					'screw_ie8': true
				},
				sourceMap: false
			})
		);
	}

	config.output.filename		= '[name].js';
	config.output.chunkFilename	= config.output.filename;

	module.exports	= config;
EOM

webpack --config webpack.js
