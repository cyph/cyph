#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..

./commands/buildunbundledassets.sh

cd native

node -e "
	const package = JSON.parse(fs.readFileSync('package.base.json').toString());
	const nativePackage = JSON.parse(
		fs.readFileSync('../shared/lib/native/package.json').toString()
	);

	const id = package.nativescript.id;

	for (const k of ['dependencies', 'devDependencies', 'nativescript']) {
		package[k] = nativePackage[k];
	}

	package.nativescript.id = id;

	fs.writeFileSync('package.json', JSON.stringify(package));
"

rm -rf app 2> /dev/null
cp -rf ../shared/js/native app
rm app/app.module.ngfactory.ts
cp -rf ../shared/css ./css
cp -rf \
	../shared/assets \
	../shared/js/typings \
./
cp -rf \
	../shared/assets \
	../shared/assets/css/app.css \
	package.json \
app/

rm -rf app/js
mkdir app/js
find ../shared/js -mindepth 1 -maxdepth 1 -type d -not -name native -exec cp -rf {} app/js/ \;

find app/js -regextype posix-extended -regex '.*/.*\.native\.(scss|html)' -exec bash -c '
	f="$(echo "{}" | perl -pe "s/\.native\.[a-z]+$//g")";
	ext="$(echo "{}" | perl -pe "s/.*\.([a-z]+)$/\1/g")";
	cat "${f}.native.${ext}" | perl -pe "s/(\.\.\/\.\.\/\.\.\/\.\.\/css)/..\/\1/g" > "${f}.${ext}";
	rm "${f}.native.${ext}";
' \;

find app/js -type f -name '*.module.ts' -exec bash -c '
	cat "{}" |
		grep -vP "(?<!class )CyphWebModule" |
		sed "s|NgModule}|NgModule, NO_ERRORS_SCHEMA}|g" |
		sed "s|imports:|schemas: [NO_ERRORS_SCHEMA], imports:|g" \
	> "{}.new"
	mv "{}.new" "{}"
' \;

cp tsconfig.base.json tsconfig.json
for plugin in $(cat plugins.list) ; do
	if [ ! -f "app/externals/${plugin}.ts" ] ; then
		cat > "app/externals/${plugin}.ts" <<- EOM
			/* tslint:disable */
			export default (<any> self).require('${plugin}');
		EOM
	fi
	node -e "
		const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json').toString());
		tsconfig.compilerOptions.paths['${plugin}'] = ['app/externals/${plugin}'];
		fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
	"
done

rm -rf \
	app/App_Resources \
	hooks \
	platforms \
2> /dev/null
cp -rf \
	../shared/lib/native/app/App_Resources \
	../shared/lib/native/app/vendor* \
app/
cp -rf \
	../shared/lib/native/hooks \
	../shared/lib/native/platforms \
	../shared/lib/native/tsconfig.aot.json \
	../shared/lib/native/webpack.config.js \
./
rm hooks/*/nativescript-dev-typescript.js 2> /dev/null

exceptions='nsWebpack.uglifyMangleExcludes'
newExceptions="Array.from(new Set(${exceptions}.concat(require('../scripts/mangleexceptions'))))"
sed -i "s|${exceptions}|${newExceptions}|g" webpack.config.js

node -e "
	const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json').toString());
	const aotTsconfig = JSON.parse(fs.readFileSync('tsconfig.aot.json').toString());
	for (const k of Object.keys(tsconfig.compilerOptions.paths)) {
		aotTsconfig.compilerOptions.paths[k] = tsconfig.compilerOptions.paths[k];
	}
	fs.writeFileSync('tsconfig.aot.json', JSON.stringify(aotTsconfig));
"

for arr in \
	'/node_modules node_modules'
do
	read -ra arr <<< "${arr}"
	bindmount "${arr[0]}" "${arr[1]}"
done
