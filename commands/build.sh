#!/bin/bash

outputDir="$PWD"
cd $(cd "$(dirname "$0")"; pwd)/..
rootDir="$PWD"


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

if [ "${cloneworkingdir}" ] ; then
	mkdir ~/.build
	cp -rf * .babelrc ~/.build/
	cd ~/.build/
fi

tsfiles="$( \
	{ \
		find ${tsfilesRoot} -name '*.html' -not \( \
			-path "${tsfilesRoot}/.build/*" \
			-or -path "${tsfilesRoot}/websign/*" \
			-or -path '*/lib/*' \
		\) -exec cat {} \; | \
		grep -oP "src=(['\"])/js/.*?\1" & \
		grep -roP "importScripts\((['\"])/js/.*\1\)" shared/js & \
		echo cyph/analytics; \
	} | \
		perl -pe "s/.*?['\"]\/js\/(.*)\.js.*/\1/g" | \
		sort | \
		uniq | \
		grep -v 'Binary file' | \
		grep -v 'preload/global' | \
		grep -v 'main.lib' | \
		grep -v 'translations' \
)"

cd shared

scssfiles="$(cd css ; find . -name '*.scss' | grep -v bourbon/ | perl -pe 's/\.\/(.*)\.scss/\1/g' | tr '\n' ' ')"


output=''

modulename () {
	m="$(echo ${1} | perl -pe 's/.*\/([^\/]+)$/\u$1/')"
	classM="$(grep -oiP "class\s+${m}" ${1}.ts | perl -pe 's/class\s+//')"

	if [ "${classM}" ] ; then
		echo "${classM}"
	else
		echo "${m}"
	fi
}

tsbuild () {
	node -e "
		const tsconfig	= JSON.parse(
			fs.readFileSync('tsconfig.json').toString().
				split('\n').
				filter(s => s.trim()[0] !== '/').
				join('\n')
		);

		tsconfig.compilerOptions.alwaysStrict		= undefined;
		tsconfig.compilerOptions.noUnusedParameters	= undefined;

		$(test "${watch}" && echo "
			tsconfig.compilerOptions.lib			= undefined;
			tsconfig.compilerOptions.target			= 'es6';
		")

		tsconfig.compilerOptions.outDir	= '.';

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

	output="${output}$(ngc -p . 2>&1)"
}

compile () {
	cd "${outputDir}"

	if [ "${cloneworkingdir}" ] ; then
		find . -mindepth 1 -maxdepth 1 -type d -not -name lib -exec bash -c '
			rm -rf ~/.build/shared/{} 2> /dev/null;
			cp -a {} ~/.build/shared/;
		' \;
		cd ~/.build/shared
	fi

	for f in $scssfiles ; do
		command=" \
			scss -Icss css/${f}.scss \
				$(test "${minify}" && echo '| cleancss') \
			> ${outputDir}/css/${f}.css \
		"
		if [ "${watch}" ] ; then
			eval "${command}" &
		else
			output="${output}$(eval "${command}" 2>&1)"
		fi
	done

	cd js

	if [ "${test}" ] ; then
		output="${output}$(../../commands/tslint.sh 2>&1)"
	fi

	tsbuild $(echo "$tsfiles" | grep -vP '/main$')

	for f in $(echo "$tsfiles" | grep -P '/main$') ; do
		tsbuild $f
		sed -i 's|./appmodule|./appmodule.ngfactory|g' "${f}.ts"
		sed -i 's|AppModule|AppModuleNgFactory|g' "${f}.ts"
		sed -i 's|bootstrapModule|bootstrapModuleFactory|g' "${f}.ts"
		tsbuild $f
	done

	if [ ! "${test}" ] ; then
		node -e 'console.log(`
			self.translations = ${JSON.stringify(
				child_process.spawnSync("find", [
					"../../translations",
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
		`.trim())' > "${outputDir}/js/translations.js"

		tsbuild preload/global
		mv preload/global.js preload/global.js.tmp
		cat preload/global.js.tmp |
			if [ "${minify}" ] ; then uglifyjs ; else cat - ; fi |
			sed 's|use strict||g' \
		> "${outputDir}/js/preload/global.js"
		rm preload/global.js.tmp

		mangleExcept="$(
			test "${minify}" && node -e "console.log(JSON.stringify('$(
				find . -name '*.js' -exec cat {} \; |
					grep -oP '[A-Za-z_$][A-Za-z0-9_$]*' |
					sort |
					uniq |
					tr '\n' ' '
			)'.trim().split(/\s+/)))"
		)"

		typesRegex="s/^import.*from\s+[\\\"']($(echo -n "$({
			ls ../lib/js/@types;
			grep -P 'declare\s+module' ../lib/js/@types/*/index.d.ts |
				perl -pe "s/.*declare\s+module\s+(.*?)\s+.*/\1/g" |
				sed "s/[\"']//g" \
			;
		} | sort | uniq)" | tr '\n' '|'))[\\\"'];$//g"

		find . -name '*.js' -exec bash -c "
			cat {} | perl -pe \"${typesRegex}\" > {}.new;
			mv {}.new {};
		" \;

		for f in $tsfiles ; do
			m="$(modulename "${f}")"

			# Don't use ".js" file extension for Webpack outputs. No idea
			# why right now, but it breaks the module imports in Session.
			cat > "${f}.webpack.js" <<- EOM
				const webpack	= require('webpack');

				module.exports	= {
					entry: {
						app: './${f}.js'
					},
					output: {
						filename: './${f}.js.tmp',
						library: '${m}',
						libraryTarget: 'var'
					},
					plugins: [
						$(test "${minify}" && echo "
							new webpack.LoaderOptionsPlugin({
								debug: false,
								minimize: true
							}),
							new webpack.optimize.UglifyJsPlugin({
								compress: false,
								mangle: {
									except: ${mangleExcept}
								},
								output: {
									comments: false
								},
								sourceMap: false,
								test: /\.js(\.tmp)?$/
							}),
						")
						$(test "${m}" == 'Main' && echo "
							new webpack.optimize.CommonsChunkPlugin({
								name: 'lib',
								filename: './${f}.lib.js.tmp',
								minChunks: module => /\/lib\//.test(module.resource)
							})
						")
					]
				};
			EOM

			webpack --config "${f}.webpack.js"
		done

		for f in $tsfiles ; do
			m="$(modulename "${f}")"

			if [ "${m}" == 'Main' ] ; then
				cat "${f}.lib.js.tmp" | sed 's|use strict||g' > "${outputDir}/js/${f}.lib.js"
				rm "${f}.lib.js.tmp"
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
			} |
				sed 's|use strict||g' \
			> "${outputDir}/js/${f}.js"

			rm "${f}.js.tmp"
		done

		for js in $(find . -name '*.js' -not \( \
			-path './preload/global.js' -o \
			-name 'translations.js' \
		\)) ; do
			delete=true
			for f in $tsfiles ; do
				if [ "${js}" == "./${f}.js" -o "${js}" == "./${f}.lib.js" ] ; then
					delete=''
				fi
			done
			if [ "${delete}" ] ; then
				rm "${js}"
			fi
		done
	fi
}

litedeploy () {
	cd ~/.litedeploy

	version="lite-${username}-${branch}"
	deployedBackend="https://${version}-dot-cyphme.appspot.com"
	localBackend='${locationData.protocol}//${locationData.hostname}:42000'

	sed -i "s|staging|${version}|g" default/config.go
	sed -i "s|${localBackend}|${deployedBackend}|g" cyph.im/js/cyph.im/main.js
	cat cyph.im/cyph-im.yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > yaml.new
	mv yaml.new cyph.im/cyph-im.yaml

	gcloud app deploy --quiet --no-promote --project cyphme --version $version */*.yaml

	cd
	rm -rf ~/.litedeploy

	echo -e "\n\n\nFinished deploying\n\n"
}

if [ "${watch}" ] ; then
	eval "$(${rootDir}/commands/getgitdata.sh)"

	liteDeployInterval=1800 # 30 minutes
	SECONDS=$liteDeployInterval

	while true ; do
		start="$(date +%s)"
		echo -e '\n\n\nBuilding JS/CSS\n\n'
		output=''
		compile
		echo -e "${output}\n\n\nFinished building JS/CSS ($(expr $(date +%s) - $start)s)\n\n"
		${rootDir}/commands/tslint.sh

		#if [ $SECONDS -gt $liteDeployInterval -a ! -d ~/.litedeploy ] ; then
		#	echo -e "\n\n\nDeploying to lite env\n\n"
		#	mkdir ~/.litedeploy
		#	cp -rf "${rootDir}/default" "${rootDir}/cyph.im" ~/.litedeploy/
		#	litedeploy &
		#	SECONDS=0
		#fi

		cd "${rootDir}/shared"
		inotifywait -r --exclude '(node_modules|sed.*|.*\.(css|js|map|tmp))$' css js templates
	done
else
	compile
fi

echo -e "${output}"
exit ${#output}
