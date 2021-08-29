#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/../..

rm -rf .websign.tmp 2> /dev/null
cp -a websign .websign.tmp
cd .websign.tmp

sed -i "s|'/|'|g" index.html

sed -i 's|location\.host\s*= |//|g' js/main.js
sed -i "s|location\.host|'cyph.app'|g" js/main.js
sed -i 's|!hashWhitelist|false \&\& !hashWhitelist|g' js/main.js

cat > js/init.js << EOM
self.history.pushState = undefined;
self.cordova = {};
self.device = {};
document.addEventListener('DOMContentLoaded', () => {
	setTimeout(() => document.dispatchEvent(new Event('deviceready')), 250);
	setTimeout(() => document.dispatchEvent(new Event('backbutton')), 500);
});

$(cat ../websign/js/init.js)
EOM

cd ..
touch websign-serve.ready
