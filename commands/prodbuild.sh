#!/bin/bash


onexit () {
	mv /node_modules/uglifyjs-webpack-plugin/dist/uglify/minify.js.bak /node_modules/uglifyjs-webpack-plugin/dist/uglify/minify.js 2> /dev/null
}
trap onexit EXIT

cp /node_modules/uglifyjs-webpack-plugin/dist/uglify/minify.js /node_modules/uglifyjs-webpack-plugin/dist/uglify/minify.js.bak


# Temporary workarounds for https://github.com/angular/angular-cli/issues/10525

commandsDir="$(cd "$(dirname "$0")" ; pwd)"

sed -i "s|^\s*compress,|compress: compress === true ? {sequences: false} : typeof compress === 'object' ? {...compress, sequences: false} : compress,|g" /node_modules/uglifyjs-webpack-plugin/dist/uglify/minify.js

sed -i "s/mangle:.*,/mangle: mangle === false ? false : {...(typeof mangle === 'object' ? mangle : {}), reserved: require('$(echo "${commandsDir}" | sed 's|/|\\/|g')\\/mangleexceptions').mangleExceptions},/g" /node_modules/uglifyjs-webpack-plugin/dist/uglify/minify.js


ng build --prod --output-hashing none "${@}"

exit



# Skipping everything after this pending Angular CLI >=6.x eject support

dependencyModules="$(
	grep -roP "(import|from) '[@A-Za-z0-9][^' ]*';" src/js |
		perl -pe "s/.*?'(.*)';/\1/g" |
		sort |
		uniq |
		tr '\n' ' '
)"

ng eject --prod --output-hashing none "${@}"

cat > webpack.js <<- EOM
	const HtmlWebpackPlugin		= require('html-webpack-plugin');
	const path					= require('path');
	const UglifyJsPlugin		= require('uglifyjs-webpack-plugin');
	const {CommonsChunkPlugin}	= require('webpack').optimize;
	const {mangleExceptions}	= require('../commands/mangleexceptions');
	const config				= require('./webpack.config.js');

	const chunks	=
		'${dependencyModules}'.
			trim().
			split(/\s+/).
			map(s => path.join('node_modules', s)).
			concat([
				'src/js/cyph',
				'src/js/cyph/components',
				'src/js/cyph/services',
				'src/js/cyph/services/crypto/threaded-potassium.service',
				'src/js/cyph/thread',
				'src/js/standalone/translations'
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

	const commonsChunkIndex	= config.plugins.indexOf(
		config.plugins.find(o => o instanceof CommonsChunkPlugin)
	);

	for (const chunk of chunks) {
		config.plugins.splice(
			commonsChunkIndex,
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
		const {options}	= config.plugins[uglifyJsIndex];

		options.uglifyOptions.compress.sequences	= false;
		options.uglifyOptions.mangle				= {reserved: mangleExceptions};

		config.plugins.splice(uglifyJsIndex, 1, new UglifyJsPlugin(options));
	}

	config.output.filename		= '[name].js';
	config.output.chunkFilename	= config.output.filename;

	module.exports	= config;
EOM

webpack --config webpack.js

# Temporary workaround for https://github.com/angular/angular-cli/issues/9484
if [ ! -d dist/assets ] ; then cp -a src/assets dist/ ; fi
if [ ! -f dist/favicon.ico ] ; then cp src/favicon.ico dist/ ; fi
