#!/bin/bash

outputDir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..
rootDir="$PWD"

externals="{
	'_stream_duplex': 'undefined',
	'_stream_writable': 'undefined',
	'faye-websocket': '{Client: self.WebSocket}',
	'libsodium': '{sodium: self.sodium}',
	'request': 'undefined',
	'rsvp': 'undefined'
}"


cloneworkingdir=''
test=''
watch=''
minify=''

if [ "${1}" == '--watch' ] ; then
	watch=true
	shift
else
	if [ "${1}" == '--prod' ] ; then
		shift
	else
		test=true
	fi
	if [ "${1}" == '--no-minify' ] ; then
		shift
	else
		minify=true
	fi
fi

if [ ! -d ~/.build ] ; then
	cloneworkingdir=true
fi

tsfilesRoot="${outputDir}"
if [ "${cloneworkingdir}" -o "${test}" -o "${watch}" -o "${outputDir}" == "${rootDir}" ] ; then
	tsfilesRoot="${rootDir}"
	outputDir="${rootDir}/shared"
fi

tsfiles="$(
	{
		cat cyph.com/*.html cyph.ws/*.html | grep -oP "src=(['\"])/js/.*?\1";
		find ${outputDir}/js -type f -name '*.ts' -not \( \
			-name '*.ngfactory.ts' \
			-or -name '*.ngmodule.ts' \
		\) -exec cat {} \; |
			grep -oP "importScripts\((['\"])/js/.*\1\)" \
		;
		echo standalone/analytics;
	} | \
		perl -pe "s/.*?['\"]\/js\/(.*)\.js.*/\1/g" |
		grep -v 'Binary file' |
		grep -vP '^standalone/global$' |
		grep -vP '^typings$' |
		xargs -I% bash -c "ls '${outputDir}/js/%.ts' > /dev/null 2>&1 && echo '%'" |
		sort |
		uniq
)"

scssfiles="$(
	cat cyph.com/*.html cyph.ws/*.html |
		grep -oP "href=(['\"])/css/.*?\1" |
		perl -pe "s/.*?['\"]\/css\/(.*)\.css.*/\1/g" |
		sort |
		uniq
)"

cd shared


output=''

modulename () {
	m="$(echo ${1} | perl -pe 's/.*\/([^\/]+)$/\u$1/' | perl -pe 's/[^A-Za-z0-9](.)?/\u$1/g')"
	classM="$(grep -oiP "class\s+${m}" ${1}.ts | perl -pe 's/class\s+//')"

	if [ "${classM}" ] ; then
		echo "${classM}"
	else
		echo "${m}"
	fi
}

webpackname () {
	echo "${1}" | tr '/' '_'
}

tsbuild () {
	node -e "
		const tsconfig	= JSON.parse(
			fs.readFileSync('tsconfig.json').toString().
				split('\n').
				filter(s => s.trim()[0] !== '/').
				join('\n')
		);

		tsconfig.compilerOptions.outDir			= '.';

		$(test "${watch}" && echo "
			tsconfig.compilerOptions.lib		= undefined;
			tsconfig.compilerOptions.target		= 'es2015';
		")

		tsconfig.files	= 'typings/index.d ${*}'.
			trim().
			split(/\s+/).
			map(f => f + '.ts')
		;

		fs.writeFileSync(
			'tsconfig.json',
			JSON.stringify(tsconfig)
		);
	"

	echo -e "\nCompile ${*}\n$(tsc -p . 2>&1)\n\n" 1>&2
}

compile () {
	type="${1}"

	cd "${outputDir}"

	if [ "${cloneworkingdir}" ] ; then
		../commands/copyworkspace.sh --client-only ~/.build
		cd ~/.build/shared
	fi

	if [ ! "${type}" ] || [ "${type}" == css ] ; then
		for f in $scssfiles ; do
			compileF () {
				isComponent="$(echo "${f}" | grep '^components/' > /dev/null && echo true)"

				scss "css/${f}.scss" "css/${f}.css"
				if [ "${minify}" ] ; then
					cleancss --inline none "css/${f}.css" -o "css/${f}.css"
				fi

				if ! cmp "css/${f}.css" "${outputDir}/css/${f}.css" > /dev/null 2>&1 ; then
					cp -f "css/${f}.css" "${outputDir}/css/${f}.css"
				fi
			}

			if [ "${watch}" ] ; then
				compileF
			else
				output="${output}$(compileF 2>&1)"
			fi
		done
	fi

	if [ "${type}" -a "${type}" != js ] ; then
		return
	fi

	cd js

	if [ "${test}" ] ; then
		output="${output}$(../../commands/lint.sh 2>&1)"
	else
		find . -type f -name '*.js' -exec rm {} \;
	fi

	dependencyModules="$(
		grep -roP "(import|from) '[@A-Za-z0-9][^' ]*';" |
			perl -pe "s/.*?'(.*)';/\1/g" |
			sort |
			uniq |
			tr '\n' ' '
	)"

	node -e 'console.log(`
		/* tslint:disable */

		(<any> self).translations = ${JSON.stringify(
			child_process.spawnSync("find", [
				"../../translations",
				" -type",
				"f",
				"-name",
				"*.json"
			]).stdout.toString().
				split("\n").
				filter(s => s).
				map(file => ({
					key: file.split("/").slice(-1)[0].split(".")[0],
					value: JSON.parse(fs.readFileSync(file).toString())
				})).
				reduce((translations, o) => {
					translations[o.key]	= o.value;
					return translations;
				}, {})
		)};
	`.trim())' > standalone/translations.ts

	if [ "${watch}" ] ; then
		# find . -type f -name main.ts -exec bash -c "
		# 	cat '{}' |
		# 		grep -v enableProdMode |
		# 	> '{}.new'
		# 	mv '{}.new' '{}'
		# " \;

		for resource in css templates ; do
			find . -type f -name '*.ts' -exec bash -c "
				if grep '${resource}' '{}' > /dev/null ; then
					cat '{}' |
						perl -pe \"s/'(\\.\\.\\/)+${resource}/ \
							location.pathname.slice(1).replace( \
								\\/[^\\\\\\\\\/]+(\\\\\\\\\/|\\\\$)\\/g, \
								'..\\/' \
							) + '${resource}/g\" \
					> '{}.new'
					mv '{}.new' '{}'
				fi
			" \;
		done
	elif [ ! -d node_modules ] ; then
		mkdir node_modules
		cp -rf /node_modules/@angular node_modules/
	fi

	mainfiles="$(echo "${tsfiles}" | grep -P '/main$')"
	nonmainfiles="$(echo "${tsfiles}" | grep -vP '/main$')"

	tsbuild standalone/global ${nonmainfiles}
	cp standalone/global.js "${outputDir}/js/standalone/global.js" 2> /dev/null
	if [ ! "${watch}" ] ; then
		cp -rf ../css ../templates ./
	fi

	if [ "${minify}" ] ; then 
		uglifyjs standalone/global.js -o "${outputDir}/js/standalone/global.js"

		for d in . "${outputDir}/js" ; do
			find "${d}" -type f \( -name '*.js' -or -name '*.ts' \) -not \( \
				-name '*.ngfactory.js' \
				-or -name '*.ngmodule.js' \
			\) -exec cat {} \; |
				grep -oP '[A-Za-z_$][A-Za-z0-9_$]*'
		done |
			sort |
			uniq |
			tr '\n' ' ' \
		> /tmp/mangle

		node -e "fs.writeFileSync(
			'/tmp/mangle.json',
			JSON.stringify(
				fs.readFileSync('/tmp/mangle').toString().trim().split(/\s+/)
			)
		)"
	fi

	for f in ${nonmainfiles} ${mainfiles} ; do
		m="$(modulename "${f}")"
		mainparent="$(echo "${f}" | sed 's|/main$||')"
		appModule="$(echo "${f}" | sed 's|/main$|/app.module|')"
		packDir="js/${mainparent}/pack"
		packDirFull="${outputDir}/${packDir}"
		htmldir="${rootDir}/$(echo "${f}" | sed 's/\/.*//')"
		htmlinput="${htmldir}/index.html"
		htmloutput="${htmldir}/.index.html"

		if [ "${watch}" ] ; then
			{
				if [ "${m}" == 'Main' ] ; then
					cp -f "${htmlinput}" "${htmloutput}"
				fi

				cat > "${f}.webpack.js" <<- EOM
					const webpack	= require('webpack');

					module.exports	= {
						entry: {
							app: './${f}'
						},
						externals: ${externals},
						module: {
							rules: [
								{
									test: /\.(html|css)$/,
									use: [{loader: 'raw-loader'}]
								},
								{
									test: /\.scss$/,
									use: [
										{loader: 'raw-loader'},
										{loader: 'sass-loader'}
									]
								},
								{
									test: /\.ts$/,
									use: [
										{loader: 'awesome-typescript-loader'},
										{loader: 'angular2-template-loader'}
									]
								}
							]
						},
						output: {
							filename: '${f}.js.tmp',
							library: '${m}',
							libraryTarget: 'var',
							path: '${PWD}'
						},
						resolve: {
							extensions: ['.js', '.ts']
						}
					};
				EOM

				webpack --config "${f}.webpack.js"

				echo
			} &

			continue
		fi

		aot=''
		enableSplit=''
		prerender=''
		if [ "${m}" == 'Main' ] ; then
			aot=true

			if [ "${test}" ] ; then
				echo -n
			elif [ "${minify}" ] ; then
				# if [ "${f}" == 'cyph.com/main' ] ; then
				# 	prerender=true
				# else
					enableSplit=true
					rm -rf $packDirFull 2> /dev/null
					mkdir $packDirFull
				# fi
			else
				cp -f "${htmlinput}" "${htmloutput}"
			fi

			rm -rf node_modules 2> /dev/null
			ln -s /node_modules node_modules

			node -e "
				const tsconfig	= JSON.parse(
					fs.readFileSync('tsconfig.json').toString().
						split('\n').
						filter(s => s.trim()[0] !== '/').
						join('\n')
				);

				tsconfig.files	= ['typings/index.d.ts', '${f}.ts'];

				fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
			"
		fi

		# Don't use ".js" file extension for Webpack outputs. No idea
		# why right now, but it breaks the module imports in Session.
		webpackConfig="{
			entry: chunks.concat({
				name: 'main',
				path: './${f}$(test "${aot}" && echo -n '.ts')'
			}).reduce(
				(o, chunk) => { o[chunk.name] = chunk.path; return o; },
				{}
			),
			externals: ${externals},
			$(test "${aot}" && echo "
				module: {
					rules: [
						{
							test: /\.(html|css)$/,
							use: [{loader: 'raw-loader'}]
						},
						{
							test: /\.scss$/,
							use: [
								{loader: 'raw-loader'},
								{loader: 'sass-loader'}
							]
						},
						{
							test: /\.ts$/,
							use: [{loader: '@ngtools/webpack'}]
						}
					]
				},
			")
			output: {
				$(test "${enableSplit}" || echo "
					filename: '${f}.js.tmp',
					library: '${m}',
					libraryTarget: 'var',
					path: '${PWD}'
				")
				$(test "${enableSplit}" && echo "
					filename: '[name].js',
					chunkFilename: '[name].js',
					path: '${packDirFull}'
				")
			},
			plugins: [
				$(test "${aot}" && echo "
					new AotPlugin({
						entryModule: '${PWD}/${appModule}#AppModule',
						tsConfigPath: './tsconfig.json'
					}),
				")
				$(test "${minify}" && echo "
					new webpack.LoaderOptionsPlugin({
						debug: false,
						minimize: true
					}),
					new webpack.optimize.UglifyJsPlugin({
						compress: false,
						mangle: {
							except: JSON.parse(
								fs.readFileSync('/tmp/mangle.json').toString()
							)
						},
						output: {
							comments: false
						},
						sourceMap: false,
						test: /\.js(\.tmp)?$/
					})
				")
			].concat(
				$(test "${enableSplit}" || echo '[]')
				$(test "${enableSplit}" && echo "
					chunks.map(chunk =>
						new webpack.optimize.CommonsChunkPlugin({
							name: 'commons__' + chunk.name,
							chunks: ['main', chunk.name]
						})
					).concat(
						new webpack.optimize.CommonsChunkPlugin({
							name: 'init',
							minChunks: Infinity
						})
					)
				")
			),
			resolve: {
				$(test "${aot}" && echo "
					extensions: ['.ts', '.js', '.html']
				")
			}
		}"

		if [ "${enableSplit}" ] ; then
			echo -e "\nPack ${f}\n$({ time node -e "
				const AotPlugin	= require('@ngtools/webpack').AotPlugin;
				const cheerio	= require('cheerio');
				const glob		= require('glob');
				const webpack	= require('webpack');

				const chunks	=
					'${dependencyModules}'.trim().split(/\s+/).
						concat([
							'./cyph/services/crypto/threaded-potassium.service.ts',
							'./cyph/thread'
						]).
						/*
							Disabled for now because it makes the build take
							a long time and doesn't seem to add much benefit.

							concat(
								glob.sync('./cyph/components/**.ts').
									map(path => path.slice(0, -3)).
									map(path => [path, path + '.ngfactory']).
									reduce((a, b) => a.concat(b))
							).
						*/
						map(path => ({
							path,
							name: path.replace(/\//g, '_')
						}))
				;

				webpack(${webpackConfig}, (err, stats) => {$(test "${enableSplit}" && echo "
					if (err) {
						throw err;
					}

					const \$	= cheerio.load(fs.readFileSync('${htmlinput}').toString());

					\$('script[src=\"/js/${f}.js\"]').remove();

					for (
						const file of ['init.js'].concat(
							stats.compilation.entrypoints.main.chunks.
								map(chunk => chunk.files).
								reduce((a, b) => a.concat(b)).
								filter(file => file !== 'init.js')
						)
					) {
						\$('body').append(
							\`<script defer src='/${packDir}/\${file}'></script>\`
						);
					}

					fs.writeFileSync('${htmloutput}', \$.html().trim());
				")});
			"; } 2>&1)" 1>&2
		else
			echo "
				const AotPlugin	= require('@ngtools/webpack').AotPlugin;
				const fs		= require('fs');
				const webpack	= require('webpack');

				const chunks	= [];

				module.exports	= ${webpackConfig};
			" > "${f}.webpack.js"

			if [ "${prerender}" ] ; then
				time ng-render \
					--template "${htmlinput}" \
					--module "${appModule}.ts" \
					--symbol AppModule \
					--project . \
					--webpack "${f}.webpack.js" \
					--output "${htmldir}"
			else
				time webpack --config "${f}.webpack.js"
			fi
		fi

		rm -rf node_modules 2> /dev/null

		if (( $? )) && [ "${test}" ] ; then
			output="${output} "
		fi

		echo -e '\n\n'
	done

	if [ "${test}" ] ; then
		return
	fi

	for f in $tsfiles ; do
		m="$(modulename "${f}")"

		if [ "${watch}" ] ; then
			while [ ! -f "${f}.js.tmp" ] ; do
				sleep 1
			done
		fi

		if [ "${m}" == 'Main' ] ; then
			if [ -f "${f}.js.tmp" ] ; then
				mv "${f}.js.tmp" "${outputDir}/js/${f}.js"
			fi

			continue
		fi

		{
			echo '(function () {';
			cat "${f}.js.tmp";
			echo "
				self.${m}	= ${m};

				var keys	= Object.keys(${m});
				for (var i = 0 ; i < keys.length ; ++i) {
					var key		= keys[i];
					self[key]	= ${m}[key];
				}
			" |
				if [ "${minify}" ] ; then uglifyjs ; else cat - ; fi \
			;
			echo '})();';
		} \
			> "${outputDir}/js/${f}.js"

		rm "${f}.js.tmp"
	done

	if [ "${watch}" ] ; then
		return
	fi

	for js in $(find . -type f -name '*.js' -not \( \
		-path './standalone/global.js' \
		-or -path './standalone/translations.js' \
		-or -path './*/pack/*' \
	\)) ; do
		delete=true
		for f in $tsfiles ; do
			if [ "${js}" == "./${f}.js" ] ; then
				delete=''
			fi
		done
		if [ "${delete}" ] ; then
			rm "${js}"
		fi
	done

	find "${outputDir}/js" -type f -name '*.js' -not -path '*/node_modules/*' -exec \
		sed -i 's|use strict||g' {} \
	\;
}

if [ "${watch}" ] ; then
	eval "$(${rootDir}/commands/getgitdata.sh)"

	init="$(mktemp -d)/init"
	for type in css js ; do
		typeUppercase="$(echo ${type} | tr '[:lower:]' '[:upper:]')"

		while true ; do
			start="$(date +%s)"
			echo -e "\n\n\nBuilding ${typeUppercase}\n\n"
			compile "${type}"
			echo -e "\n\n\nFinished building ${typeUppercase} ($(expr $(date +%s) - ${start})s)\n\n"
			touch "${init}"

			cd "${rootDir}/shared"

			while true ; do
				fsevent="$(
					inotifywait -r --exclude '(sed.*|.*\.(css|js|map|tmp))$' "${type}"
				)"
				if ! echo "${fsevent}" | grep -P '(ACCESS|CLOSE|OPEN|ISDIR)' > /dev/null ; then
					echo "${fsevent}"
					break
				fi
			done
		done &

		while [ ! -f "${init}" ] ; do sleep 5 ; done
	done

	sleep Infinity
else
	compile
fi

echo -e "${output}"
if [ "${test}" ] ; then
	if [ "${#output}" == "0" ] ; then
		echo -e '\n\nPASS\n\n'
	else
		echo -e '\n\nFAIL\n\n'
	fi
fi
exit ${#output}
