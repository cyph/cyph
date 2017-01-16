#!/bin/bash

rm -rf ${1} 2> /dev/null
mkdir -p ${1}/shared
cp -rf $(ls | grep -v shared) ${1}/
cd shared
cp -rf $(ls | grep -v lib) ${1}/shared/
rm ${1}/shared/js/node_modules
sed -i "s|\"../node_modules|\"${NODE_PATH}|g" ${1}/shared/js/typings/libs.d.ts
