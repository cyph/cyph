#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..
dir="$(pwd)"


cloneworkingdir=''
test=''
watch=''

if [ "${1}" == '--watch' ] ; then
	watch=true
	shift
elif [ "${1}" != '--prod' ] ; then
	test=true
	shift
fi
if [ ! -d ~/.build ] ; then
	cloneworkingdir=true
fi

if [ "${cloneworkingdir}" ] ; then
	mkdir ~/.build
	cp -rf * ~/.build/
	cd ~/.build/
fi

tsfiles="$( \
	{ \
		find . -name '*.html' -not \( \
			-path './.build/*' \
			-or -path './websign/*' \
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
		grep -v 'main.lib' | \
		tr ' ' '\n' \
)"

cd shared

scssfiles="$(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g' | tr '\n' ' ')"


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
			fs.readFileSync('tsconfig.json').toString()
		);

		tsconfig.compilerOptions.outDir	= '.';

		tsconfig.files	= 'preload/global ${*}'.
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
	cd "${dir}/shared"

	if [ "${cloneworkingdir}" ] ; then
		find . -mindepth 1 -maxdepth 1 -type d -not -name lib -exec bash -c '
			rm -rf ~/.build/shared/{} 2> /dev/null;
			cp -rf {} ~/.build/shared/;
		' \;
		cd ~/.build/shared
	fi

	for f in $scssfiles ; do
		command="scss -Icss ${f}.scss ${dir}/shared/${f}.css"
		if [ "${watch}" ] ; then
			$command &
		else
			output="${output}$($command 2>&1)"
		fi
	done

	cd js

	output="${output}$(../../commands/tslint.sh 2>&1)"

	if [ ! "${test}" ] ; then
		for f in $tsfiles ; do
			node -e "
				const resolveReferences	= f => {
					const path		= fs.realpathSync(f);
					const parent	= path.split('/').slice(0, -1).join('/');

					return fs.readFileSync(path).toString().trim().replace(
						/\/\/\/ <reference path=\"(.*)\".*/g,
						(ref, sub) => sub.match(/\.d\.ts\$/) ?
							ref :
							\`export const _\${crypto.randomBytes(4).toString('hex')} = (() => {
								\${resolveReferences(parent + '/' + sub)}
							})();\`
					);
				};

				fs.writeFileSync(
					'${f}.ts',
					resolveReferences('${f}.ts')
				);
			"
		done
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
		translations="$(node -e 'console.log(`
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
		`.trim())')"

		for f in $tsfiles ; do
			m="$(modulename "${f}")"

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
					$(test "${m}" == 'Main' && echo "
						plugins: [
							new webpack.optimize.CommonsChunkPlugin({
								name: 'lib',
								filename: './${f}.lib.js',
								minChunks: module => /\/lib\//.test(module.resource)
							})
						]
					")
				};
			EOM

			webpack --config "${f}.webpack.js"
		done
		for f in $tsfiles ; do
			m="$(modulename "${f}")"
			outputDir="${dir}/shared/js"
			outputFile="${outputDir}/${f}.js"

			rm "${outputFile}" 2> /dev/null

			if [ "${m}" == 'Main' ] ; then
				babel --presets es2015 --compact false "${f}.lib.js" -o "${outputDir}/${f}.lib.js"
				echo "${translations}" > "${outputFile}"
			fi

			{
				cat preload/global.js;
				cat $f.js.tmp | sed "0,/var ${m} =/s||self.${m} =|";
				echo "(function () {
					self.${m}Base	= self.${m};

					var keys	= Object.keys(self.${m}Base);
					for (var i = 0 ; i < keys.length ; ++i) {
						var key		= keys[i];
						self[key]	= self.${m}Base[key];
					}
				})();";
			} | \
				if [ "${watch}" ] ; then cat - ; else babel --presets es2015 --compact false ; fi | \
				sed 's|use strict||g' \
			>> "${outputFile}"

			rm $f.js.tmp
		done

		for js in $(find . -name '*.js') ; do
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
	eval "$(${dir}/commands/getgitdata.sh)"

	liteDeployInterval=1800 # 30 minutes
	SECONDS=$liteDeployInterval

	while true ; do
		start="$(date +%s)"
		echo -e '\n\n\nBuilding JS/CSS\n\n'
		output=''
		compile
		echo -e "${output}\n\n\nFinished building JS/CSS ($(expr $(date +%s) - $start)s)\n\n"

		#if [ $SECONDS -gt $liteDeployInterval -a ! -d ~/.litedeploy ] ; then
		#	echo -e "\n\n\nDeploying to lite env\n\n"
		#	mkdir ~/.litedeploy
		#	cp -rf "${dir}/default" "${dir}/cyph.im" ~/.litedeploy/
		#	litedeploy &
		#	SECONDS=0
		#fi

		cd "${dir}/shared"
		inotifywait -r --exclude '(node_modules|sed.*|.*\.(css|js|map|tmp))$' css js templates
	done
else
	compile
fi

echo -e "${output}"
exit ${#output}
