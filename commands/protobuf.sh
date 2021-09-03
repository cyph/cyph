#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..


rm -rf shared/js/proto 2> /dev/null
mkdir shared/js/proto
pbjs -t static-module types.proto -o shared/js/proto/index.js
sed -i 's|null|undefined|g' shared/js/proto/index.js
checkfail
pbts shared/js/proto/index.js -o shared/js/proto/types.d.ts
checkfail
touch shared/js/proto/types.js
echo "export * from './types';" > shared/js/proto/index.d.ts

# https://github.com/protobufjs/protobuf.js/issues/1306#issuecomment-549204730
sed -i "s|\[ 'object' \]\.|Record|g" shared/js/proto/types.d.ts
sed -i "s|\[ 'Array' \]\.|Array|g" shared/js/proto/types.d.ts

cp shared/js/proto/index.js shared/js/proto/index.web.js

echo 'const module = {exports: {}};' > shared/js/proto/index.node.js
cat shared/js/proto/index.js >> shared/js/proto/index.node.js
rg '^(enum|message) (.*) \{' types.proto |
	awk '{print $2}' |
	perl -pe 's/(.+)/export const $1 = module.exports.$1;/g' \
>> shared/js/proto/index.node.js
echo 'export default module.exports;' >> shared/js/proto/index.node.js
