#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


plugins="$(cat shared/js/native/plugins.list)"

cd
# tns create cyph --ng --appid com.cyph.app || exit 1
tns create cyph --template tns-template-hello-world-ng@rc --appid com.cyph.app || exit 1
cd cyph
node -e '
	const package	= JSON.parse(fs.readFileSync("package.json").toString());
	package.dependencies["@angular/compiler-cli"]	= package.dependencies["@angular/compiler"];
	fs.writeFileSync("package.json", JSON.stringify(package));
'
mkdir node_modules 2> /dev/null
npm install || exit 1

cp ${dir}/shared/js/native/firebase.nativescript.json ./
for plugin in ${plugins} ; do tns plugin add ${plugin} < /dev/null || exit 1 ; done

cp -rf node_modules node_modules.old
rm -rf node_modules/@types 2> /dev/null
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
rm -rf app/js/cyph/components/material
rm -rf app/js/cyph/components/checkout.component.ts
rm -rf app/js/cyph/components/register.component.ts
mv app/css app/templates app/js/

for module in cyph-app cyph-common ; do
	modulePath="app/js/cyph/modules/${module}.module.ts"
	cat "${modulePath}" | grep -v CyphWebModule > "${modulePath}.new"
	mv "${modulePath}.new" "${modulePath}"
done

find app -type f -name '*.scss' -exec bash -c '
	scss -C "{}" "$(echo "{}" | sed "s/\.scss$/.css/")"
' \;

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('${dir}/shared/js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	tsconfig.compilerOptions.outDir	= '.';

	tsconfig.angularCompilerOptions	= {
		genDir: '.',
		skipMetadataEmit: true
	};

	tsconfig.files	= [
		'app/main.ts',
		'app/js/preload/global.ts',
		'app/js/cyph/base.ts',
		'app/js/cyph/crypto/potassium/index.ts',
		'typings/index.d.ts'
	];

	fs.writeFileSync(
		'tsconfig.json',
		JSON.stringify(tsconfig)
	);
"


./node_modules/.bin/ngc -p .
sed -i 's|\./app.module|\./app.module.ngfactory|g' app/main.ts
sed -i 's|AppModule|AppModuleNgFactory|g' app/main.ts
sed -i 's|bootstrapModule|bootstrapModuleFactory|g' app/main.ts
./node_modules/.bin/ngc -p .
rm tsconfig.json

for platform in android ios ; do
	cat > webpack.js <<- EOM
		const webpack	= require('webpack');

		module.exports	= {
			entry: {
				app: './app/main'
			},
			externals: {
				$(for plugin in ${plugins} ; do echo "
					'${plugin}': \"require('${plugin}')\",
				" ; done)
				jquery: 'undefined',
				libsodium: 'self.sodium',
				simplewebrtc: '{}'
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
			resolve: {
				extensions: [
					'.js',
					'.css',
					'.${platform}.js',
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
	# ../commands/websign/threadpack.ts app/main.${platform}.js

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
