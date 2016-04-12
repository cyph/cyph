#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

cp -rf shared/js shared/.js.tmp
cd shared/.js.tmp

rm -rf ../js/docs

# NOTE: "--mode file" is a workaround for a typedoc bug; should be "--mode modules"
typedoc --experimentalDecorators -t ES5 -m system --moduleResolution classic --out ../js/docs --name Cyph --mode file --includeDeclarations --excludeExternals .

cd ..
rm -rf .js.tmp
