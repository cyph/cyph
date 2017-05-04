#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


plugins="$(cat shared/js/native/plugins.list)"

cd
tns create cyph --ng --appid com.cyph.app || exit 1
cd cyph
mkdir node_modules 2> /dev/null
npm install || exit 1

cp ${dir}/shared/js/native/firebase.nativescript.json ./
for plugin in ${plugins} ; do tns plugin add ${plugin} < /dev/null || exit 1 ; done

cp -rf node_modules node_modules.old
rm -rf \
	node_modules/@angular \
	node_modules/@types \
	node_modules/rxjs \
	node_modules/typescript \
	node_modules/zone.js \
2> /dev/null
for d in $(ls -a /node_modules) ; do
	if [ ! -d "node_modules/${d}" ] ; then
		cp -rf "/node_modules/${d}" node_modules/
	fi
done

mkdir -p tmp/app
mv app/App_Resources tmp/app/
cd tmp

cp ${dir}/shared/lib/js/base.js ./
mv ../node_modules ./
cp -rf ${dir}/shared/js/typings ./
cp -rf ${dir}/shared/js/native/* app/
cp -rf ${dir}/shared/css/native app/css
cp -rf ${dir}/shared/templates/native app/templates
mv app/css/app.scss app/

rm -rf app/js
mkdir -p app/js/cyph.im app/js/preload
cp ${dir}/shared/js/preload/global.ts app/js/preload/
cp -rf ${dir}/shared/js/cyph.im/enums app/js/cyph.im/
cp -rf ${dir}/shared/js/cyph app/js/

for module in cyph-app cyph-common ; do
	modulePath="app/js/cyph/modules/${module}.module.ts"
	cat "${modulePath}" |
		grep -v CyphWebModule |
		sed 's|{NgModule}|{NgModule, NO_ERRORS_SCHEMA}|g' |
		sed 's|exports:|schemas: [NO_ERRORS_SCHEMA], exports:|g' \
	> "${modulePath}.new"
	mv "${modulePath}.new" "${modulePath}"
done

find app -type f -name '*.scss' -exec bash -c '
	scss -C -Iapp/css "{}" "$(echo "{}" | sed "s/\.scss$/.css/")"
' \;
cp -rf app/css app/templates app/js/

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('${dir}/shared/js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	tsconfig.compilerOptions.outDir	= '.';

	tsconfig.files	= [
		'app/main.ts',
		'app/js/preload/global.ts',
		'app/js/cyph/base.ts',
		'app/js/cyph/crypto/potassium/index.ts',
		'typings/index.d.ts'
	];

	fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig));
"

sed -i 's|/platform|/platform-static|g' app/main.ts
sed -i 's|platformNativeScriptDynamic|platformNativeScript|g' app/main.ts
./node_modules/@angular/compiler-cli/src/main.js -p .
sed -i 's|\./app.module|\./app.module.ngfactory|g' app/main.ts
sed -i 's|AppModule|AppModuleNgFactory|g' app/main.ts
sed -i 's|bootstrapModule|bootstrapModuleFactory|g' app/main.ts


for platform in android ios ; do
	cat > webpack.js <<- EOM
		const AotPlugin	= require('@ngtools/webpack').AotPlugin;
		const webpack	= require('webpack');

		module.exports	= {
			entry: {
				app: './app/main.ts'
			},
			externals: {
				$(for plugin in ${plugins} ; do echo "
					'${plugin}': \"require('${plugin}')\",
				" ; done)
				jquery: 'undefined',
				libsodium: 'self.sodium',
				simplewebrtc: '{}'
			},
			module: {
				rules: [
					{
						test: /\.html$/,
						use: [{loader: 'raw-loader'}]
					},
					{
						test: /\.css$/,
						use: [{loader: 'raw-loader'}]
					},
					{
						test: /\.ts$/,
						use: [{loader: '@ngtools/webpack'}]
					}
				]
			},
			node: {
				http: false,
				timers: false,
				setImmediate: false
			},
			output: {
				filename: 'app/main.${platform}.js',
				path: '${PWD}'
			},
			plugins: [
				new AotPlugin({
					entryModule: '${PWD}/app/app.module#AppModule',
					tsConfigPath: './tsconfig.json'
				})
			],
			resolve: {
				extensions: [
					'.ts',
					'.js',
					'.html',
					'.css',
					'.${platform}.ts',
					'.${platform}.js',
					'.${platform}.html',
					'.${platform}.css'
				],
				modules: [
					'node_modules/tns-core-modules',
					'node_modules',
					'/node_modules'
				]
			}
		};
	EOM

	webpack --config webpack.js
	sed -i 's|lib/js/||g' app/main.${platform}.js
	sed -i 's|js/|app/js/|g' app/main.${platform}.js
	/cyph/commands/websign/threadpack.js app/main.${platform}.js

	cp base.js main.${platform}.js
	echo >> main.${platform}.js
	cat app/js/preload/global.js >> main.${platform}.js
	node -e 'console.log(`
		self.translations = ${JSON.stringify(
			child_process.spawnSync("find", [
				"../translations",
				"-name",
				"*.json"
			]).stdout.toString().
				split("\n").
				filter(s => s).
				map(file => ({
					key: file.split("/").slice(-1)[0].split(".")[0],
					value: JSON.parse(fs.readFileSync(file).toString())
				})).
				reduce((translations, o) => {
					translations[o.key]	= o.value;
					return translations;
				}, {})
		)};
	`)' >> main.${platform}.js
	cat app/main.${platform}.js >> main.${platform}.js

	sed -i 's|use strict||g' main.${platform}.js
done

cd ..
rm -rf app hooks/*/nativescript-dev-typescript.js
mkdir app
mv tmp/main.*.js tmp/app/App_Resources tmp/app/app.css tmp/app/package.json app/
mv node_modules.old node_modules
rm -rf tmp

cd
rm -rf ${dir}/.nativebuild 2> /dev/null
mv cyph ${dir}/.nativebuild
