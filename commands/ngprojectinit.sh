#!/bin/bash


eval "$(parseArgs \
	--opt-bool deinit \
)"


init=true
if [ "${_arg_deinit}" == 'on' ] ; then
	init=''
fi

if [ "${init}" ] && [ "$(ls -A node_modules 2> /dev/null)" ] ; then
	exit
fi

# Workaround for Angular bug ("Module not found: Error: Recursion in resolving")
cd ..
node -e "
	const glob = require('glob');

	const tsconfig = JSON.parse(
		fs.readFileSync('shared/js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	for (const [k, v] of Array.from(
		new Set([
			...(
				fs
					.readFileSync('shared/lib/js/package-lock.json')
					.toString()
					.match(/\\n\"?@?[A-Za-z0-9_\\-\\.\\/]+/g) || []
			)
				.map(s => s.trim().replace('\"', ''))
				.filter(s => s),
			...glob.sync('node_modules/@angular/*/*/').map(s => s.slice(13, -1)),
			...glob.sync('node_modules/firebase/*/').map(s => s.slice(13, -1))
		])
	)
		.sort()
		.map(m => [m, [\`../node_modules/\${m}\`]])
	) {
		if (k in tsconfig.compilerOptions.paths) {
			continue;
		}

		tsconfig.compilerOptions.paths[k] = v;
	}

	fs.writeFileSync('shared/js/tsconfig.ng.json', JSON.stringify(tsconfig));
"
cd - &> /dev/null

rm src/favicon.ico 2> /dev/null
if [ "${init}" ] ; then
	cp ../shared/favicon.ico src/
fi

for arr in \
	'/node_modules node_modules' \
	'../shared/assets src/assets' \
	'../shared/css src/css' \
	'../shared/js src/js'
do
	read -ra arr <<< "${arr}"
	if [ "${init}" ] ; then
		bindmount "${arr[0]}" "${arr[1]}"
	else
		unbindmount "${arr[1]}"
		git checkout "${arr[1]}" &> /dev/null
	fi
done
