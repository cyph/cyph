#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


plugins="$(cat shared/js/native/plugins.list)"

cd
tns create cyph --ng --appid com.cyph.app || exit 1
cd cyph
node -e '
	const package	= JSON.parse(fs.readFileSync("package.json").toString());
	package.dependencies["@angular/compiler-cli"]	= package.dependencies["@angular/compiler"];

	/* Temporary workaround until NativeScript works with latest stable TypeScript */
	package.dependencies["typescript"]				= "2.2.0-dev.20170213";

	fs.writeFileSync("package.json", JSON.stringify(package));
'
mkdir node_modules 2> /dev/null
npm install || exit 1

cp ${dir}/shared/js/native/firebase.nativescript.json ./
for plugin in ${plugins} ; do tns plugin add ${plugin} < /dev/null || exit 1 ; done

# Temporary workaround pending NativeScript updating to TS >= 2.2
cat node_modules/tns-core-modules/declarations.d.ts | tail -n67 > declarations.d.ts.new
mv declarations.d.ts.new node_modules/tns-core-modules/declarations.d.ts

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
mv app/css app/js/

find app -type f -name '*.scss' -exec bash -c '
	scss -C "{}" "$(echo "{}" | sed "s/\.scss$/.css/")"
' \;

getmodules () {
	{
		find node_modules/${1} -mindepth 1 -type d -or -name '*.ts' \
			-not -path 'node_modules/${1}/node_modules/*' |
			sed 's|node_modules/||g' |
			sed 's|\.d\.ts$||g' |
			sed 's|\.ts$||g' \
		;
		echo "${1}/index";
	} |
		perl -pe 's/(.*)\/index/\1\n\1\/index/g' |
		sort |
		uniq
}

getbadimports () {
	grep -rP "^import .* from [\"']" app |
		grep -vP '^app/js/' |
		grep '\.ts:' |
		perl -pe "s/.* from [\"'](.*?)[\"'].*/\1/g" |
		grep -P "^($(echo -n "$(getmodules tns-core-modules | grep '/')" | tr '\n' '|'))" |
		sort |
		uniq
}

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('${dir}/shared/js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	/* For Angular AOT */
	tsconfig.compilerOptions.noUnusedLocals		= undefined;
	tsconfig.compilerOptions.noUnusedParameters	= undefined;

	tsconfig.compilerOptions.baseUrl			= '.';
	tsconfig.compilerOptions.paths				= {
		$(
			getmodules tns-core-modules |
				sed 's|^tns-core-modules/||g' |
				grep / |
				xargs -I% echo '"%": ["node_modules/tns-core-modules/%"],' |
				perl -pe 's/([^\/]+)\/\g1/\1/g' |
				sort |
				uniq
		)
	};

	tsconfig.compilerOptions.outDir				= '.';

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
for module in $(getbadimports) ; do
	newModuleParent="${PWD}/node_modules/${module}"
	oldModule="${newModuleParent}"
	newModule1="${newModuleParent}/index"
	newModule2="$(echo "${newModuleParent}" | sed 's|[^/]*$||')index"

	if [ ! -f "${oldModule}.d.ts" ] ; then
		continue
	fi

	node -e "fs.writeFileSync(
		'${oldModule}.d.ts',
		fs.readFileSync('${oldModule}.d.ts').toString().
			split('{').
			slice(1).
			join('{').
			split('}').
			slice(0, -1).
			join('}')
	)"

	mkdir -p "${newModuleParent}" 2> /dev/null

	for newModule in "${newModule1}" "${newModule2}" ; do
		for ext in d.ts android.js ios.js js ; do
			ln -s "${oldModule}.${ext}" "${newModule}.${ext}" 2> /dev/null
		done
	done
done
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
				path: '.'
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
rm -rf app hooks/before-prepare/nativescript-dev-typescript.js
mkdir app
mv tmp/main.*.js tmp/app/App_Resources tmp/app/app.css tmp/app/package.json app/
mv node_modules.old node_modules
rm -rf tmp

cd
rm -rf ${dir}/.nativebuild 2> /dev/null
mv cyph ${dir}/.nativebuild
