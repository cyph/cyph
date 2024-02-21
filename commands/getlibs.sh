#!/bin/bash


source ~/.bashrc


eval "$(parseArgs \
	--opt-bool skip-node-modules \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


skipNodeModules="$(getBoolArg ${_arg_skip_node_modules})"

sudo npm -g install npm || exit 1
sudo npm -g install @mapbox/node-pre-gyp || exit 1
npm config set fetch-retries 10
npm config set fetch-retry-maxtimeout 36000000
npm config set fetch-retry-mintimeout 36000000
npm config set fetch-timeout 216000000
npm config set legacy-peer-deps true
npm config set lockfile-version 3
npm config set maxsockets 1
rm -rf ~/.npm


installPackages () {
	rm -rf node_modules 2> /dev/null
	mkdir node_modules
	for i in {1..10} ; do
		npm install -f --ignore-scripts $(node -e "
			const o = JSON.parse(
				fs.readFileSync('${dir}/shared/lib/js/package-lock.json').toString()
			);

			for (const k of Object.keys(o.dependencies).filter(package => ${1})) {
				console.log(\`\${k}@\${o.dependencies[k].version}\`);
			}
		") && break
	done || exit 1
}


sudo rm -rf "${GOPATH}"
find . -maxdepth 2 -type f -name .go.mod -exec bash -c '
	cd $(echo "{}" | sed "s|/.go.mod||")
	go mod download
	go get -u ./...
' \;

go install github.com/codegangsta/gin@latest
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest


# NATIVESCRIPT: nativePlugins="$(cat native/plugins.list)"

sudo rm -rf \
	/node_modules \
	~/cyph \
	~/lib \
	~/node_modules \
	shared/lib/.js.tmp \
	shared/lib/js/node_modules \
	shared/lib/native \
	shared/node_modules \
2> /dev/null

cp -a shared/lib ~/

cd

mkdir cyph
# NATIVESCRIPT: installPackages "package === 'nativescript'"
# NATIVESCRIPT: rm -rf cyph package.json package-lock.json
# NATIVESCRIPT: ~/node_modules/.bin/tns error-reporting disable
# NATIVESCRIPT: ~/node_modules/.bin/tns usage-reporting disable
# NATIVESCRIPT: ~/node_modules/.bin/tns create cyph --ng --appid com.cyph.app

cd cyph
# NATIVESCRIPT: git init
# NATIVESCRIPT: for plugin in ${nativePlugins} ; do
# NATIVESCRIPT: 	~/node_modules/.bin/tns plugin add ${plugin} < /dev/null || exit 1
# NATIVESCRIPT: done
# NATIVESCRIPT: installPackages "
# NATIVESCRIPT: 	package.startsWith('nativescript-dev') ||
# NATIVESCRIPT: 	package.startsWith('tns')
# NATIVESCRIPT: "
# NATIVESCRIPT: rm package-lock.json
# NATIVESCRIPT: mv package.json package.json.tmp
# NATIVESCRIPT: sudo mv node_modules ~/native_node_modules

mkdir node_modules
cp ~/lib/js/package.json ~/lib/js/package-lock.json ./
for i in {1..10} ; do npm ci -f && break ; done || exit 1

rm -rf ~/node_modules 2> /dev/null
mv node_modules ~/
# NATIVESCRIPT: mv ~/native_node_modules ./node_modules
# NATIVESCRIPT: mv package.json.tmp package.json
cd
# NATIVESCRIPT: mv cyph ~/lib/native


cd ~/lib
cp -a js .js.tmp
cd js
mv ~/node_modules ./
cd node_modules

${dir}/commands/patchnodemodules.sh

cd ../..

mv js/node_modules .js.tmp/
rm -rf js
mv .js.tmp js

cd
if [ -d ${dir}/cyph.app ] ; then
	if [ "${skipNodeModules}" ] ; then
		rm -rf ${dir}/shared/lib 2> /dev/null
		rsync -rL --exclude node_modules lib ${dir}/shared/
	else
		rm -rf ${dir}/shared/lib ${dir}/shared/node_modules 2> /dev/null
		rsync -rL lib ${dir}/shared/
		mv ${dir}/shared/lib/js/node_modules ${dir}/shared/
	fi
fi
sudo mv lib/js/node_modules /
sudo chmod -R 777 /node_modules
rm -rf lib

# Temporary workaround pending https://github.com/angular/angular-cli/pull/22814
echo | ng analytics disable --global
