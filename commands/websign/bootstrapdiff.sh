#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/../..

./commands/websign/bootstrapstring.js > .bootstrap.original
diff -w .bootstrap.original ${1}
rm .bootstrap.original
