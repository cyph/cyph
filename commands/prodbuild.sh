#!/bin/bash


noBuild=''
if [ "${1}" == '--no-build' ] ; then
	noBuild=true
	shift
fi


# Temporary workarounds for https://github.com/angular/angular-cli/issues/10525

minifyScripts='
	/node_modules/terser-webpack-plugin/dist/minify.js
	/node_modules/uglifyjs-webpack-plugin/dist/minify.js
'

onexit () {
	for minifyScript in ${minifyScripts} ; do
		mv ${minifyScript}.bak ${minifyScript} 2> /dev/null
	done
}

if [ ! "${noBuild}" ] ; then
	trap onexit EXIT
fi

for minifyScript in ${minifyScripts} ; do
	cp ${minifyScript} ${minifyScript}.bak

	commandsDir="$(cd "$(dirname "$0")" ; pwd)"

	sed -i "s|^\s*compress:.*,|compress: typeof compress === 'undefined' \|\| (typeof compress === 'boolean' \&\& compress === true) ? {sequences: false} : typeof compress === 'object' ? {...compress, sequences: false} : compress,|g" ${minifyScript}

	sed -i "s/mangle:.*,/mangle: typeof mangle === 'boolean' \&\& mangle === false ? false : {...(typeof mangle === 'object' ? mangle : {}), reserved: require('$(echo "${commandsDir}" | sed 's|/|\\/|g')\\/mangleexceptions').mangleExceptions},/g" ${minifyScript}

	sed -i "s/safari10 = .*;/safari10 = true;/g" ${minifyScript}
done


# Workaround for https://github.com/angular/angular-cli/issues/10612

ngProdFlags='
	--aot true
	--build-optimizer true
	--extract-css true
	--extract-licenses true
	--named-chunks false
	--optimization true
	--output-hashing none
	--source-map false
	--vendor-chunk true
'

if [ ! "${noBuild}" ] ; then
	ng build ${ngProdFlags} "${@}"
else
	echo "${ngProdFlags}"
fi

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
	const TerserPlugin			= require('terser-webpack-plugin');
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

	const terserIndex	= config.plugins.indexOf(
		config.plugins.find(o => o instanceof TerserPlugin)
	);

	if (terserIndex > -1) {
		const {options}	= config.plugins[terserIndex];

		options.terserOptions.compress.sequences	= false;
		options.terserOptions.mangle				= {reserved: mangleExceptions};

		config.plugins.splice(terserIndex, 1, new TerserPlugin(options));
	}

	config.output.filename		= '[name].js';
	config.output.chunkFilename	= config.output.filename;

	module.exports	= config;
EOM

webpack --config webpack.js

# Temporary workaround for https://github.com/angular/angular-cli/issues/9484
if [ ! -d dist/assets ] ; then cp -a src/assets dist/ ; fi
if [ ! -f dist/favicon.ico ] ; then cp src/favicon.ico dist/ ; fi
