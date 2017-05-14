#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


cp -a shared/js shared/.js.tmp
cd shared/.js.tmp

rm -rf ../js/docs

# NOTE: "--mode file" is a workaround for a typedoc bug; should be "--mode modules"
typedoc --experimentalDecorators -t ES6 -m system --moduleResolution node --out ../js/docs --name Cyph --mode file --includeDeclarations --excludeExternals .

cd ..
rm -rf .js.tmp
