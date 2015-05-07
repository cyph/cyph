#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

cp -rf shared/js shared/.js.tmp
cd shared/.js.tmp

# TypeScript 1.4 workarounds
for file in $(find . -name '*.ts') ; do
	cat $file | perl -pe 's/\sof\s/ in /g' | perl -pe 's/const\s/let /g' > $file.tmp
	mv $file.tmp $file
done
echo 'var crypto: Crypto;' >> global/base.ts

typedoc --mode modules --name Cyph --out ../js/docs -t ES6 --noEmitOnError --theme default .

cd ..
rm -rf .js.tmp
