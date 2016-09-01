#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

rm .git/index.lock 2> /dev/null

git pull
chmod -R 700 .
git add .
git commit -S -a -m "${*}"
git push

# Automated cleanup and beautification

find . -name '*.go' | grep -v github.com | xargs -I% gofmt -w "%"

ls shared/css/*.scss | xargs -I% bash -c '
sass-convert --from scss --to scss --dasherize --indent t % | awk "{
if (\$1 != \"/*\")
	gsub(/\"/, \"'"'"'\", \$0)
print \$0
}" > %.new
mv %.new %
'

find shared/js -name '*.ts' -print0 |
	xargs -0 -I% bash -c "cat % | perl -pe 's/\\s+$/\n/g' | perl -pe 's/    /\\t/g' > %.new ; mv %.new %"

chmod -R 700 .
git commit -S -a -m "cleanup: ${*}"
git push

cd shared/lib
rm -rf blog
mkdir blog
cd blog
mkdir hnbutton ; curl --compressed https://hnbutton.appspot.com/static/hn.min.js > hnbutton/hn.min.js
mkdir twitter ; wget https://platform.twitter.com/widgets.js -O twitter/widgets.js
mkdir google ; wget https://apis.google.com/js/plusone.js -O google/plusone.js
wget "https://apis.google.com$(cat google/plusone.js | grep -oP '/_/scs/.*?"' | sed 's|\\u003d|=|g' | sed 's|__features__|plusone/rt=j/sv=1/d=1/ed=1|g' | rev | cut -c 2- | rev)/cb=gapi.loaded_0" -O google/plusone.helper.js
mkdir facebook ; wget https://connect.facebook.net/en_US/sdk.js -O facebook/sdk.js
mkdir disqus ; wget https://cyph.disqus.com/embed.js -O disqus/embed.js
npm install --save simple-jekyll-search
mv node_modules/simple-jekyll-search ./
rm -rf node_modules
cd ../../..

chmod -R 700 .
git commit -S -a -m "update blog libs: ${*}"
git push

cd "${dir}"
