#!/bin/bash


rm -rf app 2> /dev/null
cp -rf ../shared/js/native app
cp -rf ../shared/css/native app/css
mv app/css/app.scss app/
cp -r ../shared/css/* app/
cp -r ../shared/css/* app/css/
rm -rf app/native app/css/native
cp -rf ../shared/templates/native app/templates
cp package.json app/

rm -rf app/js
mkdir -p app/js/cyph.ws app/js/standalone
cp ../shared/js/standalone/global.ts app/js/standalone/
cp -rf ../shared/js/cyph.ws/enums app/js/cyph.ws/
cp -rf ../shared/js/cyph app/js/
cp -rf ../shared/js/environments app/js/
cp -rf ../shared/js/typings app/js/

for module in cyph-app cyph-common ; do
	modulePath="app/js/cyph/modules/${module}.module.ts"
	cat "${modulePath}" |
		grep -v CyphWebModule |
		sed 's|NgModule}|NgModule, NO_ERRORS_SCHEMA}|g' |
		sed 's|exports:|schemas: [NO_ERRORS_SCHEMA], exports:|g' \
	> "${modulePath}.new"
	mv "${modulePath}.new" "${modulePath}"
done

cp tsconfig.base.json tsconfig.json
for plugin in $(cat plugins.list) ; do
	cat > "app/externals/${plugin}.ts" <<- EOM
		/* tslint:disable */
		export default require('${plugin}');
	EOM
	node -e "
		const tsconfig	= JSON.parse(fs.readFileSync('tsconfig.json').toString());
		tsconfig.compilerOptions.paths['${plugin}']	= 'app/externals/${plugin}';
		fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
	"
done

for arr in \
	'node_modules /node_modules' \
	'app/App_Resources /native/app/App_Resources' \
	'hooks /native/hooks' \
	'platforms /native/platforms' \
	'app/assets ../shared/assets' \
	'typings ../shared/js/typings'
do
	read -ra arr <<< "${arr}"

	rm "${arr[0]}" 2> /dev/null
	mkdir "${arr[0]}" 2> /dev/null
	sudo mount --bind "${arr[1]}" "${arr[0]}"
done
