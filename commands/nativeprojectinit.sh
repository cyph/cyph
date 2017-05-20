#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..

./commands/buildunbundledassets.sh

cd native

node -e "
	const package		= JSON.parse(fs.readFileSync('package.base.json').toString());
	const nativePackage	= JSON.parse(
		fs.readFileSync('../shared/lib/native/package.json').toString()
	);

	const id	= package.nativescript.id;

	for (const k of ['dependencies', 'devDependencies', 'nativescript']) {
		package[k]	= nativePackage[k];
	}

	package.nativescript.id	= id;

	fs.writeFileSync('package.json', JSON.stringify(package));
"

rm -rf app 2> /dev/null
cp -rf ../shared/js/native app
rm app/app.module.ngfactory.ts
cp -rf ../shared/js/typings ./
cp -rf ../shared/css/native ./css
cp ../shared/assets/css/native/app.css app/
cp -r ../shared/css/* ./css/
cp -rf ../shared/templates/native ./templates
cp -rf ../shared/assets app/
cp -rf ../shared/assets ./
cp package.json app/

rm -rf app/js
mkdir app/js
find ../shared/js -mindepth 1 -maxdepth 1 -type d -not -name native -exec cp -rf {} app/js/ \;
for pattern in "styleUrls: \['../" "templateUrl: '../" ; do
	grep -rl "${pattern}" app/js | xargs -I% sed -i "s|${pattern}|${pattern}../|" %
done

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
		const tsconfig	= JSON.parse(fs.readFileSync('tsconfig.json').toString());
		tsconfig.compilerOptions.paths['${plugin}']	= ['app/externals/${plugin}'];
		fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
	"
done

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
rm hooks/*/nativescript-dev-typescript.js

node -e "
	const tsconfig		= JSON.parse(fs.readFileSync('tsconfig.json').toString());
	const aotTsconfig	= JSON.parse(fs.readFileSync('tsconfig.aot.json').toString());
	for (const k of Object.keys(tsconfig.compilerOptions.paths)) {
		aotTsconfig.compilerOptions.paths[k]	= tsconfig.compilerOptions.paths[k];
	}
	fs.writeFileSync('tsconfig.aot.json', JSON.stringify(aotTsconfig));
"

for arr in \
	'node_modules /node_modules'
do
	read -ra arr <<< "${arr}"

	rm -rf "${arr[0]}" 2> /dev/null
	mkdir "${arr[0]}" 2> /dev/null
	sudo mount --bind "${arr[1]}" "${arr[0]}"
done
