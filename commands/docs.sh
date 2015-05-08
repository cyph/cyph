#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

cp -rf shared/js shared/.js.tmp
cd shared/.js.tmp

# TypeScript 1.4 workarounds
for file in $(find . -name '*.ts') ; do
	cat $file | perl -pe 's/(^[^*]+)\sof\s/\1 in /g' | perl -pe 's/const\s/let /g' > $file.tmp
	mv $file.tmp $file
done
echo 'var crypto: Crypto;' >> global/base.ts

rm -rf ../js/docs

# NOTE: "--mode file" is a workaround for a typedoc bug; should be "--mode modules"
typedoc -t ES6 --out ../js/docs --name Cyph --mode file --includeDeclarations --excludeExternals .

cd ..
rm -rf .js.tmp
