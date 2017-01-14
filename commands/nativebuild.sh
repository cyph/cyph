#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..
dir="$PWD"

./commands/getlibs.sh


cd
tns create cyph --ng --appid com.cyph.app
cd cyph
tns platform add android --sdk 22
mv node_modules node_modules.old
rm hooks/before-prepare/nativescript-dev-typescript.js
cd

rm -rf "${dir}/.nativebuild" 2> /dev/null
mv cyph "${dir}/.nativebuild"
cd "${dir}/.nativebuild"

mv app app.old
mkdir app
mv app.old/App_Resources app/
rm -rf app.old

cp ../shared/lib/js/base.js ./
cp -rf ../shared/lib/js/node_modules node_modules
for d in $(ls node_modules.old | grep -v '@types') ; do
	rm -rf "node_modules/${d}" 2> /dev/null
	mv "node_modules.old/${d}" node_modules/
done
rm -rf node_modules.old
cp -rf ../shared/js/typings ./
cp ../shared/js/tsconfig.native.json tsconfig.json
cp -rf ../shared/js/native/* app/
cp -rf ../shared/css/native/* app/
cp -rf ../shared/templates/native app/templates

rm -rf app/js
mkdir -p app/js/preload
cp ../shared/js/preload/global.ts app/js/preload/
cp -rf ../shared/js/cyph app/js/
cp -rf ../shared/js/cyph.im app/js/

find app -type f -name '*.scss' -not -path '*/node_modules/*' -exec bash -c '
	scss -I../shared/css "{}" "$(echo "{}" | sed "s/\.scss$/.css/")"
' \;

externals="$(
	grep -roP "from '.*'" app |
		grep '\.ts:' |
		perl -pe "s/.*from '(.*?)'/\1/g" |
		sort |
		uniq |
		grep -P '^(nativescript|tns-|@angular)'
)"

cat > webpack.js <<- EOM
	const webpack	= require('webpack');

	module.exports	= {
		entry: {
			app: './app/main.js'
		},
		externals: {
			$(
				for external in $externals ; do
					echo "'${external}': \"require('${external}')\","
				done
			)
			simplewebrtc: '{}'
		},
		output: {
			filename: './app/main.js'
		}
	};
EOM

# ngc -p .
# sed -i 's|\./app.module|\./app.module.ngfactory|g' app/main.ts
# sed -i 's|AppModule|AppModuleNgFactory|g' app/main.ts
# sed -i 's|bootstrapModule|bootstrapModuleFactory|g' app/main.ts
# ngc -p .

/opt/ts-node/node_modules/.bin/tsc -p .
webpack --config webpack.js
sed -i 's|\.\./\.\./\.\./templates|templates|g' app/main.js
sed -i 's|lib/js/||g' app/main.js
mv app/js ./
rm tsconfig.json
# ../commands/websign/threadpack.ts app/main.js

cp js/preload/global.js main.js
cat >> main.js <<- EOM
	self.document	= {
		createElement: function () {
			return {};
		},
		documentElement: {
			appendChild: function () {}
		}
	};

	self.firebase	= {
		apps: [{}]
	};
EOM
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
`)' >> main.js
cat app/main.js >> main.js
mv main.js app/main.js

sed -i 's|use strict||g' app/main.js

find app -type f -name '*.ts' -not -path '*/node_modules/*' -exec rm {} \;
