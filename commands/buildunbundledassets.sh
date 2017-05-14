#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..


checkfail () {
	if (( $? )) ; then
		exit 1
	fi
}


nodeModulesAssets="$(
	grep -roP "importScripts\('/assets/node_modules/.*?\.js'\)" shared/js |
		perl -pe "s/^.*?'\/assets\/node_modules\/(.*?)'.*/\1/g" |
		sort |
		uniq
)"

typescriptAssets="cyph/crypto/native-web-crypto-polyfill standalone/analytics $(
	grep -roP "importScripts\('/assets/js/.*?\.js'\)" shared/js |
		perl -pe "s/^.*?'\/assets\/js\/(.*?)\.js'.*/\1/g" |
		grep -vP '^standalone/global$' |
		sort |
		uniq
)"

scssAssets="$(
	grep -oP "href='/assets/css/.*?\.css'" */src/index.html |
		perl -pe "s/^.*?'\/assets\/css\/(.*?)\.css'.*/\1/g" |
		sort |
		uniq
)"


cd shared/assets
rm -rf node_modules js css 2> /dev/null
mkdir node_modules js css


cd node_modules

for f in ${nodeModulesAssets} ; do
	mkdir -p "$(echo "${f}" | perl -pe 's/(.*)\/[^\/]+$/\1/')" 2> /dev/null
	cp "/node_modules/${f}" "${f}"
done


cd ../js

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('../../js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	tsconfig.compilerOptions.baseUrl	= '../../js';
	tsconfig.compilerOptions.rootDir	= '../../js';
	tsconfig.compilerOptions.outDir		= '.';

	tsconfig.files	= [
		'../../js/standalone/global.ts',
		'../../js/typings/index.d.ts'
	];

	for (const k of Object.keys(tsconfig.compilerOptions.paths)) {
		tsconfig.compilerOptions.paths[k]	=
			tsconfig.compilerOptions.paths[k].map(s =>
				s.replace(/^js\//, '')
			)
		;
	}

	fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
"

tsc -p .
checkfail
uglifyjs standalone/global.js -o standalone/global.js
checkfail

for f in ${typescriptAssets} ; do
	m="$(echo ${f} | perl -pe 's/.*\/([^\/]+)$/\u$1/' | perl -pe 's/[^A-Za-z0-9](.)?/\u$1/g')"

	cat > webpack.js <<- EOM
		const TsConfigPathsPlugin	= require('awesome-typescript-loader').TsConfigPathsPlugin;
		const webpack				= require('webpack');

		module.exports	= {
			entry: {
				app: '../../js/${f}'
			},
			module: {
				rules: [
					{
						test: /\.ts$/,
						use: [{loader: 'awesome-typescript-loader'}]
					}
				]
			},
			output: {
				filename: '${f}.js',
				library: '${m}',
				libraryTarget: 'var',
				path: '${PWD}'
			},
			resolve: {
				extensions: ['.ts'],
				plugins: [
					new TsConfigPathsPlugin({
						compiler: "typescript",
						configFileName: "tsconfig.json"
					})
				]
			}
		};
	EOM

	webpack --config webpack.js
	checkfail
	rm webpack.js

	{
		echo '(function () {';
		cat "${f}.js";
		echo "
			self.${m}	= ${m};

			var keys	= Object.keys(${m});
			for (var i = 0 ; i < keys.length ; ++i) {
				var key		= keys[i];
				self[key]	= ${m}[key];
			}
		";
		echo '})();';
	} |
		uglifyjs \
	> "${f}.js.tmp"

	checkfail

	mv "${f}.js.tmp" "${f}.js"
done


cd ../css

cp -rf ../../css/* ./
grep -rl "@import '~" | xargs -I% sed -i "s|@import '~|@import '/node_modules/|g" %

for f in ${scssAssets} ; do
	scss "${f}.scss" "${f}.css"
	checkfail
	cleancss --inline none "${f}.css" -o "${f}.css"
	checkfail
done
