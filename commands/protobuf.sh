#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..

rm -rf shared/js/proto 2> /dev/null

for f in $(find shared/proto -type f -name '*.proto') ; do
	outputDirectory="shared/js/proto/$(
		echo "${f}" | perl -pe 's/shared\/proto\/(.*?).proto/\1/g'
	)"

	mkdir -p "${outputDirectory}"

	if echo "${outputDirectory}" | grep -P '/index$' &> /dev/null ; then
		rmdir "${outputDirectory}"
		cat "${f}" | \
			perl -pe 's/import "(.*?)(\/index)?.proto";/export * from '"'"'.\/\1'"'"';/g' \
		> "${outputDirectory}.ts"
	
		continue
	fi

	pbjs -t static-module "${f}" -o "${outputDirectory}/index.js"
	sed -i 's|null|undefined|g' "${outputDirectory}/index.js"
	checkfail
	pbts "${outputDirectory}/index.js" -o "${outputDirectory}/types.d.ts"
	checkfail
	touch "${outputDirectory}/types.js"
	echo "export * from './types';" > "${outputDirectory}/index.d.ts"

	# https://github.com/protobufjs/protobuf.js/issues/1306#issuecomment-549204730
	sed -i "s|\[ 'object' \]\.|Record|g" "${outputDirectory}/types.d.ts"
	sed -i "s|\[ 'Array' \]\.|Array|g" "${outputDirectory}/types.d.ts"

	cp "${outputDirectory}/index.js" "${outputDirectory}/index.web.js"

	echo 'const module = {exports: {}};' > "${outputDirectory}/index.node.js"
	cat "${outputDirectory}/index.js" >> "${outputDirectory}/index.node.js"

	rg '^export (enum|class) ' "${outputDirectory}/types.d.ts" |
		awk '{print $3}' |
		sort |
		perl -pe 's/(.+)/export const $1 = module.exports.$1;/g' \
	>> "${outputDirectory}/index.node.js"
	echo 'export default module.exports;' >> "${outputDirectory}/index.node.js"
done
