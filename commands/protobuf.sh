#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..

rm backend/*.pb.go 2> /dev/null
protoc \
	-I=shared/proto \
	--go_out=backend \
	--go_opt=Mwebsign/websign-package-container.proto=. \
	shared/proto/websign/websign-package-container.proto
sed -i 's|package __|package main|g' backend/*.pb.go

rm -rf shared/js/proto 2> /dev/null

for f in $(ls shared/proto/bundles/*.proto) ; do
	outputDirectory="shared/js/proto/$(
		echo "${f}" | perl -pe 's/shared\/proto\/bundles\/(.*?).proto/\1/g'
	)"

	mkdir -p "${outputDirectory}"

	pbjs -t static-module "${f}" -o "${outputDirectory}/index.js"
	sed -i 's|null|undefined|g' "${outputDirectory}/index.js"
	checkfail
	pbts "${outputDirectory}/index.js" -o "${outputDirectory}/types.d.ts"
	checkfail
	touch "${outputDirectory}/types.js"
	echo "export * from './types';" > "${outputDirectory}/index.d.ts"

	node -e "fs.writeFileSync(
		'${outputDirectory}/index.js',
		fs.readFileSync('${outputDirectory}/index.js').toString().replace(
			/(factory\(require\(\"protobufjs\/minimal\"\)\);)/,
			'\$1\n\n    /* Global */ else\n        factory(global.protobuf);'
		)
	)"

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

cp -f shared/js/proto/main/* shared/js/proto/
