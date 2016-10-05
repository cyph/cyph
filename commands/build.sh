#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
originalDir="$(pwd)"

if [ "${1}" == '--watch' ] ; then
	bash -c "
		while true ; do
			./commands/build.sh
			echo -e '\n\n\nFinished building JS/CSS\n\n'
			inotifywait -r --exclude '(node_modules|sed.*|.*\.(html|css|js|map|tmp))$' shared/css shared/js
			echo -e '\n\n\nRebuilding JS/CSS\n\n'
		done
	" &

	sleep infinity
fi

tsargs="$(node -e '
	const compilerOptions	= JSON.parse(
		'"'$(cat shared/js/tsconfig.json | tr '\n' ' ')'"'
	).compilerOptions;

	console.log(Object.keys(compilerOptions).map(k => {
		const v			= compilerOptions[k];
		let argValue	= "";

		if (v === false) {
			return;
		}
		else if (v !== true) {
			argValue	= " " + v.toString();
		}

		return `--${k}${argValue}`;
	}).join(" "));
')"

tsfiles="$( \
	{ \
		find . -name '*.html' -not \( -path './websign/*' -or -path '*/lib/*' \) -exec cat {} \; | \
		grep -oP "src=(['\"])/js/.*?\1" & \
		grep -roP "importScripts\((['\"])/js/.*\1\)" shared/js; \
	} | \
		perl -pe "s/.*?['\"]\/js\/(.*)\.js.*/\1/g" | \
		sort | \
		uniq | \
		grep -v 'Binary file' | \
		tr '\n' ' ' \
)"

cd $dir
if [ -f build.sh ] ; then
	cd ..
fi
if [ -d shared ] ; then
	cd shared
fi

scssfiles="$(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g' | tr '\n' ' ')"


rm lib/js/node_modules js/node_modules 2> /dev/null
cd lib/js
ln -s . node_modules
cd ../../js
ln -s ../lib/js node_modules
cd ..


output=''

for file in $scssfiles ; do
	output="${output}$(scss -Icss $file.scss $file.css)"
done

cd js

for file in $tsfiles ; do
	output="${output}$(tsc $tsargs $file.ts)"
done

if [ "${1}" != '--simpletest' ] ; then
	find . -name '*.js' -not -path './node_modules/*' -exec node -e '
		const build	= f => {
			const path		= fs.realpathSync(f);
			const parent	= path.split("/").slice(0, -1).join("/");

			const content	= child_process.spawnSync("babel", [
				"--presets",
				"es2015",
				"--compact",
				"false"
			], {input:
				fs.readFileSync(path).toString()
			}).stdout.toString().trim().replace(
				/\/\/\/ <reference path="(.*)".*/g,
				(_, sub) => sub.match(/\.d\.ts$/) ?
					"" :
					build(parent + "/" + sub.replace(/\.ts$/, ".js"))
			);

			fs.writeFileSync(path, content);

			return content;
		};

		build("{}");
	' \;

	for file in $tsfiles ; do
		webpack \
			--optimize-dedupe \
			--output-library-target var \
			--output-library "$(echo $file | perl -pe 's/.*\/([^\/]+)$/\u$1/')" \
			$file.js \
			$file.js.tmp

		cat $file.js.tmp | sed 's|use strict||g' > $file.js
		rm $file.js.tmp
	done
fi

cd ..

echo -e "${output}"

rm lib/js/node_modules js/node_modules

if [ "${1}" == '--test' -o "${1}" == '--simpletest' ] ; then
	cd $originalDir

	rm -rf shared/js/docs

	{ \
		find shared/css -name '*.css' & \
		find shared/css -name '*.map' & \
		find shared/js -name '*.js' & \
		find shared/js -name '*.map'; \
	} | xargs -I% rm %
elif [ "${1}" == '--prod' ] ; then
	{ \
		find css -name '*.scss' & \
		find css -name '*.map' & \
		find js -name '*.ts' & \
		find js -name '*.ts.js' & \
		find js -name '*.map'; \
	} | xargs -I% rm %

	rm -rf js/docs
fi

exit ${#output}
