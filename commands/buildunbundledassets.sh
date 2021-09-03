#!/bin/bash


eval "$(parseArgs \
	--opt-bool libpotassium \
	--opt-bool prod-test \
	--opt-bool service-worker \
	--opt-bool test \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..


parallelProcesses=4
if [ "${CIRCLECI}" ] ; then
	parallelProcesses=2
fi

libpotassium="$(getBoolArg ${_arg_libpotassium})"
prodTest="$(getBoolArg ${_arg_prod_test})"
serviceWorker="$(getBoolArg ${_arg_service_worker})"
test="$(getBoolArg ${_arg_test})"


getmodulename () {
	echo "${1}" | perl -pe 's/.*\/([^\/]+)$/\u$1/' | perl -pe 's/[^A-Za-z0-9](.)?/\u$1/g'
}

mkparentdir () {
	mkdir -p "$(echo "${1}" | perl -pe 's/(.*)\/[^\/]+$/\1/')" 2> /dev/null
}

uglify () {
	if [ "${test}" ] ; then
		if [ "${1}" == '-cm' ] ; then
			shift
		fi

		terser "${@}" -b
	elif [ "${1}" == '-cm' ] ; then
		shift
		terser "${@}" -cm
	else
		terser "${@}"
	fi
}


if [ -f shared/assets/frozen ] ; then
	log 'Assets frozen'
	exit
fi


find shared/js -type f -name '*.js' -not -path 'shared/js/proto/*' -exec rm {} \;


nodeModulesAssets="$(
	grep -roP "'/assets/node_modules/.*?\.js'" shared/js |
		perl -pe "s/^.*?'\/assets\/node_modules\/(.*?)\.js'.*/\1/g" |
		sort |
		uniq
)"

typescriptAssets="$(
	{
		# NATIVESCRIPT: echo cyph/crypto/native-web-crypto-polyfill;
		echo standalone/cyph.com;
		echo standalone/node-polyfills;
		if [ "${libpotassium}" ] ; then echo cyph/crypto/potassium/index ; fi;
		grep -roP "importScripts\('/assets/js/.*?\.js'\)" shared/js |
			perl -pe "s/^.*?'\/assets\/js\/(.*?)\.js'.*/\1/g" |
			grep -vP '^standalone/global$' \
		;
	} |
		sort |
		uniq
)"

scssAssets="$(
	{
		echo app;
		grep -oP 'href="/assets/css/.*?\.css"' */src/index.html |
			perl -pe 's/^.*?"\/assets\/css\/(.*?)\.css".*/\1/g' \
		;
	} |
		sort |
		uniq
)"

hash="${serviceWorker}${test}$(
	cat \
		commands/buildunbundledassets.sh \
		shared/lib/js/package-lock.json \
		types.proto \
		$(echo "${nodeModulesAssets}" | perl -pe 's/([^\s]+)/\/node_modules\/\1.js/g') \
		$(find shared/js -type f -name '*.ts' -not \( \
			-name '*.d.ts' -or \
			-name '*.spec.ts' -or \
			-path 'shared/js/environments/*' \
		\)) \
		$(find shared/css -type f -name '*.scss') \
	|
		sha
)"


cd shared/assets

if [ -f unbundled.hash ] && [ "${hash}" == "$(cat unbundled.hash)" ] ; then
	exit 0
fi

rm -rf node_modules js css misc 2> /dev/null
mkdir node_modules js css misc


../../commands/protobuf.sh

if [ "${serviceWorker}" ] || [ "${test}" ] ; then
	node -e 'fs.writeFileSync(
		"serviceworker.js",
		fs.readFileSync("../../websign/lib/localforage.js").toString() +
		"\n" +
		fs.readFileSync("../../websign/serviceworker.js").toString().replace(
			"/* Redirect non-whitelisted paths in this origin */",
			"if (url.indexOf(\".\") > -1) { urls[url] = true; }"
		).replace(
			/\n\treturn e\.respondWith/,
			"\n\treturn; e.respondWith"
		).replace(
			/\/img\//,
			"/assets/img/"
		)
	)'
fi


cd node_modules

export test
export -f uglify
for f in ${nodeModulesAssets} ; do
	mkparentdir "${f}"
done
echo ${nodeModulesAssets} | tr ' ' '\n' | xargs -I% -P ${parallelProcesses} bash -c '
	f="%"
	path="/node_modules/${f}.js"
	if [ ! "${test}" ] && [ -f "/node_modules/${f}.min.js" ] ; then
		path="/node_modules/${f}.min.js"
	fi

	uglify -cm "${path}" -o "${f}.js"
'


cd ../misc

cp -a /node_modules/firebase firebase.tmp

for f in firebase-app firebase-messaging-sw ; do
	cat firebase.tmp/${f}.js |
		perl -pe 's/https:\/\/.*\/(.*?.js)/.\/\1/g' \
	> firebase.tmp/${f}.js.new
	mv firebase.tmp/${f}.js.new firebase.tmp/${f}.js

	cat > ${f}.webpack.js <<- EOM
		module.exports = {
			entry: {
				app: process.cwd() + '/firebase.tmp/${f}.js'
			},
			mode: 'none',
			output: {
				filename: '${f}.js',
				library: '$(
					echo ${f} | perl -pe 's/-sw$//g' | perl -pe 's/-([a-z])/\u\1/g'
				)',
				libraryTarget: 'var',
				path: process.cwd()
			},
			module: {
				rules: [
					{
						exclude: /node_modules/,
						test: /\.m?js$/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: [['@babel/preset-env']],
								plugins: ['@babel/plugin-transform-runtime']
							}
						}
					}
				]
			}
		};
	EOM

	webpack --config ${f}.webpack.js
	rm ${f}.webpack.js
	babel ${f}.js --presets=@babel/preset-env -o ${f}.js
	terser ${f}.js -o ${f}.js
done

rm -rf firebase.tmp


cd ../js

node -e "
	const tsconfig = JSON.parse(
		fs.readFileSync('../../js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	tsconfig.compilerOptions.baseUrl = '../../js';
	tsconfig.compilerOptions.rootDir = '../../js';
	tsconfig.compilerOptions.outDir = '.';

	tsconfig.files = [
		'../../js/standalone/global.ts',
		'../../js/typings/index.d.ts'
	];

	for (const k of Object.keys(tsconfig.compilerOptions.paths)) {
		tsconfig.compilerOptions.paths[k] =
			tsconfig.compilerOptions.paths[k].map(s =>
				s.replace(/^js\//, '')
			)
		;
	}

	fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
"

tsc -p .
checkfail
uglify standalone/global.js -o standalone/global.js
checkfail

for f in ${typescriptAssets} ; do
	m="$(getmodulename "${f}")"

	cat > "$(echo "${f}" | sha).webpack.js" <<- EOM
		const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
		const fs = require('fs');
		const path = require('path');
		const TerserPlugin = require('terser-webpack-plugin');
		const {mangleExceptions} = require('../../../scripts/mangleexceptions');

		const tsconfig = JSON.parse(
			fs.readFileSync('../../js/tsconfig.json').toString().
				split('\n').
				filter(s => s.trim()[0] !== '/').
				join('\n')
		);

		module.exports = {
			entry: {
				app: '../../js/${f}'
			},
			mode: 'none',
			module: {
				rules: [
					{
						loader: 'ts-loader',
						options: {
							transpileOnly: true
						},
						test: /\.ts$/
					}
				]
			},
			optimization: {
				minimize: true,
				minimizer: [
					new TerserPlugin({
						extractComments: false,
						parallel: true,
						terserOptions: {
							ecma: 5,
							ie8: false,
							output: {
								ascii_only: true,
								webkit: true,
								$(if [ "${test}" ] ; then
									echo "beautify: true, comments: true"
								else
									echo "comments: false"
								fi)
							},
							safari10: true,
							warnings: false,
							$(if [ "${test}" ] ; then
								echo "compress: false, mangle: false"
							else
								echo "
									compress: false /* {
										passes: 3,
										pure_getters: true,
										sequences: false
									} */,
									mangle: {
										reserved: mangleExceptions
									}
								"
							fi)
						}
					})
				]
			},
			output: {
				filename: '${f}.js',
				library: '${m}',
				libraryTarget: 'var',
				path: '${PWD}'
			},
			plugins: [
				new ForkTsCheckerWebpackPlugin({
					typescript: {
						configFile: 'tsconfig.json'
					}
				})
			],
			resolve: {
				alias: {
					jquery: path.resolve(__dirname, '../../js/externals/jquery.ts'),
					...Object.entries(tsconfig.compilerOptions.paths)
						.map(([k, [v]]) => [
							k,
							v.startsWith('../node_modules/') ?
								v.slice(2) :
								path.resolve(__dirname, '../../' + v + '.ts')
						])
						.reduce((o, [k, v]) => ({...o, [k]: v}), {})
				},
				extensions: ['.js', '.ts']
			}
		};
	EOM
done
echo ${typescriptAssets} | tr ' ' '\n' | xargs -I% -P ${parallelProcesses} bash -c '
	webpack --config "$(echo "%" | sha).webpack.js"
'
checkfailretry
echo -e '\n'
for f in ${typescriptAssets} ; do
	m="$(getmodulename "${f}")"

	rm "$(echo "${f}" | sha).webpack.js"

	{
		echo '(function () {';
		cat "${f}.js";
		echo "
			self.${m} = ${m};

			var keys = Object.keys(${m});
			for (var i = 0 ; i < keys.length ; ++i) {
				var key = keys[i];
				self[key] = ${m}[key];
			}
		" |
			uglify \
		;
		echo '})();';
	} \
		> "${f}.js.tmp"

	checkfail

	mv "${f}.js.tmp" "${f}.js"
	ls -lh "${f}.js"
done


cd ../css

cp -rf ../../css/* ./
grep -rl "@import '~" | xargs -I% sed -i "s|@import '~|@import '/node_modules/|g" %

echo ${scssAssets} | tr ' ' '\n' | xargs -I% -P ${parallelProcesses} \
	sass '%.scss' '%.css'
checkfailretry
echo ${scssAssets} | tr ' ' '\n' | xargs -I% -P ${parallelProcesses} \
	cleancss --inline none '%.css' -o '%.css'
checkfailretry


cd ..
find . -type f -name '*.js' -exec sed -i 's|use strict||g' {} \;
if [ "${prodTest}" ] ; then find . -type f -name '*.js' -exec terser {} -bo {} \; ; fi
echo "${hash}" > unbundled.hash
