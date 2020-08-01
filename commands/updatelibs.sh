#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/keycache.sh

# https://github.com/yarnpkg/yarn/issues/7212#issuecomment-594889917
cd ; yarn policies set-version 1.21.1 ; cd -

mkdir -p ~/lib/js ~/tmplib/js
cd ~/tmplib/js


read -r -d '' modules <<- EOM
	@agm/core
	@angular/animations
	@angular/bazel
	@angular/cdk
	@angular/cdk-experimental
	@angular/cli
	@angular/common
	@angular/compiler
	@angular/compiler-cli
	@angular/core
	@angular/elements
	@angular/flex-layout
	@angular/forms
	@angular/material
	@angular/platform-browser
	@angular/platform-browser-dynamic
	@angular/platform-server
	@angular/platform-webworker
	@angular/platform-webworker-dynamic
	@angular/router
	@angular/service-worker
	@angular-devkit/architect
	@angular-devkit/architect-cli
	@angular-devkit/build-ng-packagr
	@angular-devkit/core
	@angular-devkit/build-angular
	@angular-devkit/build-optimizer
	@angular-devkit/build-webpack
	@angular-devkit/schematics
	@angular-devkit/schematics-cli
	@asymmetrik/ngx-leaflet
	@beezleeart/ngx-filemanager
	@compodoc/compodoc
	@covalent/core
	@covalent/dynamic-forms
	@covalent/highlight
	@covalent/http
	@covalent/markdown
	@ctrl/ngx-emoji-mart
	@ctrl/ngx-rightclick
	@cyph/prettier
	@cyph/pretty-quick
	@firebase/app
	@firebase/app-types
	@firebase/auth
	@firebase/auth-types
	@firebase/component
	@firebase/database
	@firebase/database-types
	@firebase/firestore
	@firebase/firestore-types
	@firebase/functions
	@firebase/functions-types
	@firebase/messaging
	@firebase/messaging-types
	@firebase/storage
	@firebase/storage-types
	@fortawesome/angular-fontawesome
	@fortawesome/fontawesome-free
	@fortawesome/free-brands-svg-icons
	@fortawesome/free-solid-svg-icons
	@fortawesome/fontawesome-svg-core
	@google-cloud/storage
	@ngrx/core
	@ngrx/effects
	@ngrx/router-store
	@ngrx/store
	@ngrx/store-devtools
	@ngtools/webpack
	@ngx-gallery/core
	@ngx-gallery/gallerize
	@ngx-gallery/lightbox
	@ngx-share/button@https://github.com/buu700/ngx-share-button-tmp
	@ngx-share/buttons@https://github.com/buu700/ngx-share-buttons-tmp
	@ngx-share/core@https://github.com/buu700/ngx-share-core-tmp
	@ngxs/devtools-plugin
	@ngxs/logger-plugin
	@ngxs/storage-plugin
	@ngxs/store
	@opentok/client
	@rign/angular2-filemanager
	@syncfusion/ej2
	@syncfusion/ej2-angular-barcode-generator
	@syncfusion/ej2-angular-base
	@syncfusion/ej2-angular-buttons
	@syncfusion/ej2-angular-calendars
	@syncfusion/ej2-angular-charts
	@syncfusion/ej2-angular-circulargauge
	@syncfusion/ej2-angular-diagrams
	@syncfusion/ej2-angular-documenteditor
	@syncfusion/ej2-angular-dropdowns
	@syncfusion/ej2-angular-filemanager
	@syncfusion/ej2-angular-gantt
	@syncfusion/ej2-angular-grids
	@syncfusion/ej2-angular-heatmap
	@syncfusion/ej2-angular-inplace-editor
	@syncfusion/ej2-angular-inputs
	@syncfusion/ej2-angular-kanban
	@syncfusion/ej2-angular-layouts
	@syncfusion/ej2-angular-lineargauge
	@syncfusion/ej2-angular-lists
	@syncfusion/ej2-angular-maps
	@syncfusion/ej2-angular-navigations
	@syncfusion/ej2-angular-notifications
	@syncfusion/ej2-angular-pdfviewer
	@syncfusion/ej2-angular-pivotview
	@syncfusion/ej2-angular-popups
	@syncfusion/ej2-angular-progressbar
	@syncfusion/ej2-angular-querybuilder
	@syncfusion/ej2-angular-richtexteditor
	@syncfusion/ej2-angular-schedule
	@syncfusion/ej2-angular-splitbuttons
	@syncfusion/ej2-angular-spreadsheet
	@syncfusion/ej2-angular-treegrid
	@syncfusion/ej2-angular-treemap
	@syncfusion/ej2-barcode-generator
	@syncfusion/ej2-base
	@syncfusion/ej2-buttons
	@syncfusion/ej2-calendars
	@syncfusion/ej2-charts
	@syncfusion/ej2-circulargauge
	@syncfusion/ej2-compression
	@syncfusion/ej2-data
	@syncfusion/ej2-diagrams
	@syncfusion/ej2-documenteditor
	@syncfusion/ej2-drawings
	@syncfusion/ej2-dropdowns
	@syncfusion/ej2-excel-export
	@syncfusion/ej2-file-utils
	@syncfusion/ej2-filemanager
	@syncfusion/ej2-gantt
	@syncfusion/ej2-grids
	@syncfusion/ej2-heatmap
	@syncfusion/ej2-icons
	@syncfusion/ej2-inplace-editor
	@syncfusion/ej2-inputs
	@syncfusion/ej2-kanban
	@syncfusion/ej2-layouts
	@syncfusion/ej2-lineargauge
	@syncfusion/ej2-lists
	@syncfusion/ej2-maps
	@syncfusion/ej2-navigations
	@syncfusion/ej2-notifications
	@syncfusion/ej2-office-chart
	@syncfusion/ej2-pdf-export
	@syncfusion/ej2-pdfviewer
	@syncfusion/ej2-pivotview
	@syncfusion/ej2-popups
	@syncfusion/ej2-progressbar
	@syncfusion/ej2-querybuilder
	@syncfusion/ej2-richtexteditor
	@syncfusion/ej2-schedule
	@syncfusion/ej2-splitbuttons
	@syncfusion/ej2-spreadsheet
	@syncfusion/ej2-svg-base
	@syncfusion/ej2-treegrid
	@syncfusion/ej2-treemap
	@types/braintree-web
	@types/country-list
	@types/dompurify
	@types/dropzone
	@types/file-saver
	@types/fullcalendar@3.5.2
	@types/hammerjs
	@types/hark
	@types/html-to-text
	@types/intro.js
	@types/jasmine
	@types/jquery
	@types/jspdf
	@types/lodash-es
	@types/long
	@types/markdown-it
	@types/materialize-css
	@types/msgpack-lite
	@types/node
	@types/openpgp
	@types/pdfjs-dist
	@types/pdfkit
	@types/pulltorefreshjs
	@types/quill
	@types/simple-peer
	@types/stacktrace-js
	@types/universal-analytics
	@types/video.js
	@typescript-eslint/eslint-plugin
	@typescript-eslint/eslint-plugin-tslint
	@typescript-eslint/parser
	@typescript-eslint/typescript-estree
	@webcomponents/custom-elements
	@yaga/leaflet-ng2
	angular-fittext
	angular-material-clock-time-picker
	angular-speed-dial
	angular2-draggable
	angular2-text-mask
	animate.css@https://github.com/daneden/animate.css
	animated-scroll-to
	awesome-typescript-loader
	babel-core
	babel-preset-env
	babel-preset-es2015
	bitpay.js
	bourbon@4.2.7
	braintree
	braintree-web
	braintree-web-drop-in
	cheerio
	clean-css-cli
	clipboard-polyfill@^2
	codelyzer
	comlink
	core-js
	core-js-bundle
	core-js-pure
	cornerstone-core
	cors
	country-list
	crypto-browserify
	csv
	csv-parse
	csv-stringify
	d3
	datauri
	dompurify
	dope-qr
	dropzone
	dwv
	eslint
	eslint-plugin-import
	eslint-plugin-no-null
	eslint-plugin-prefer-arrow
	eslint-plugin-unicorn
	fast-crc32c
	fast-text-encoding@https://github.com/buu700/fast-text-encoding
	faye-websocket
	fcm-node
	fg-loadcss
	file-saver
	firebase
	firebase-admin
	firebase-functions
	firebase-server
	firebase-tools
	fullcalendar@3.6.1
	glob
	gpu.js
	granim
	gulp
	hammerjs
	hark
	highlight.js
	html-minifier
	html-to-text
	html2canvas
	htmlencode
	htmllint
	husky
	ical-generator@~0.2
	image-type
	intro.js
	jasmine-core
	jasmine-spec-reporter
	jquery
	jquery-appear-original
	jsdoc@3.5.5
	jsdom
	jspdf
	jsqr
	karma
	karma-chrome-launcher
	karma-cli
	karma-coverage-istanbul-reporter
	karma-jasmine
	karma-jasmine-html-reporter
	konami
	lamejs
	lazy
	leaflet
	libsodium
	libsodium-sumo
	libsodium-wrappers
	libsodium-wrappers-sumo
	libvorbis.js
	localforage
	lodash
	lodash-es
	long
	lunr
	lz4@0.6.3
	mailchimp-api-v3
	markdown-escapes
	markdown-it
	markdown-it-emoji
	markdown-it-sup
	mat-video@https://github.com/buu700/mat-video-tmp
	materialize-css
	math-expression-evaluator
	maxmind
	mceliece
	microlight-string
	mkdirp
	moment
	msgpack-lite
	mustache
	nativescript
	nativescript-angular
	nativescript-css-loader
	nativescript-dev-typescript
	nativescript-dev-webpack
	nativescript-theme-core
	ng-animate
	ng-fullcalendar@https://github.com/buu700/ng-fullcalendar-tmp
	ng-packagr
	ng2-fittext
	ng2-pdf-viewer
	ng2-truncate
	ngx-bar-rating
	ngx-build-plus
	ngx-captcha@https://github.com/buu700/ngx-captcha-tmp
	ngx-contextmenu
	ngx-image-cropper
	ngx-progressbar
	ngx-scrollbar
	ngx-teximate
	node-fetch
	node-sass
	nodemailer@4
	notify-cli
	ntru
	openpgp
	opentok
	opn
	opus-recorder
	parchment
	pdfjs-dist
	pdfkit
	pdf-lib
	pinch-zoom-js
	prettier
	primeng
	promise-semaphore
	protobufjs@6.8.8
	protractor@^6
	pulltorefreshjs
	puppeteer
	quill@https://github.com/buu700/quill-tmp
	quill-delta
	quill-delta-to-html
	quill-markdown
	read
	readable-stream
	recorder.js
	recordrtc
	reflect-metadata
	request
	resize-observer-polyfill
	retire@^2
	rlwe
	rsvp
	run-node
	rxjs
	rxjs-tslint@0.1.5
	rxjs-tslint-rules
	sass
	sidh
	simple-peer@https://github.com/feross/simple-peer
	simplebtc
	simplewebrtc
	sodiumutil
	sphincs
	stacktrace-js
	stylelint
	stylelint-scss
	supersphincs
	tab-indent
	terser
	terser-webpack-plugin
	text-mask-addons
	textillate
	tns-android
	tns-core-modules
	tns-core-modules-widgets
	tns-ios
	tns-platform-declarations
	ts-node
	tslib
	tslint
	tslint-consistent-codestyle
	tslint-eslint-rules
	tslint-immutable
	tslint-microsoft-contrib
	tsutils
	typedoc
	typescript@3.9
	u2f-api-polyfill
	uglify-es
	universal-analytics
	unsemantic
	username-blacklist@https://github.com/cyph/The-Big-Username-Blacklist
	video.js
	videojs-background
	videojs-brand
	videojs-bug
	videojs-hotkeys
	videojs-playlist
	videojs-record
	videojs-theater-mode
	videojs-wavesurfer
	watermarkjs@https://github.com/brianium/watermarkjs
	wavesurfer.js
	web-animations-js
	web-social-share
	webpack
	webpack-cli
	webrtc-adapter
	webrtcsupport
	webrtc-troubleshoot
	whatwg-fetch
	wowjs
	xkcd-passphrase
	zone.js
	$(cat ${dir}/native/plugins.list)
EOM


# Temporary workaround for flat dependencies pending https://github.com/yarnpkg/yarn/issues/1658
#
# cd ..
# yarn add semver
# cd -
#
# echo {} > package.json
#
# script -fc "
# 	while true ; do
# 		answer=\"\$(node -e '
# 			const semver = require(\"semver\");
#
# 			const modules = \`${modules}\`;
#
# 			const getPinnedVersion = package =>
# 				(modules.match(new RegExp(
# 					\`(^|\\\\s+)\${package}@((\\\\d|\\\\.)+)(\n|\$)\`
# 				)) || [])[2]
# 			;
#
# 			console.log(
# 				(
# 					fs.readFileSync(\"yarn.out\").
# 						toString().
# 						split(\"Unable to find a suitable version\").
# 						slice(1)
# 				).map(section => (
# 					section.match(/\"[^\\n]+\" which resolved to \"[^\\n]+\"/g) || []
# 				).
# 					map((s, i) => {
# 						const split = s.split(\"\\\"\");
# 						const version = split[3];
# 						const pinnedVersion = getPinnedVersion(split[1].split(\"@\")[0]);
#
# 						return {
# 							index: i + 1,
# 							isPinned: !!pinnedVersion && semver.satisfies(version, pinnedVersion),
# 							version
# 						};
# 					}).
# 					reduce(
# 						(a, b) =>
# 							a.isPinned && !b.isPinned ?
# 								a :
# 							b.isPinned && !a.isPinned ?
# 								b :
# 							semver.gt(a.version, b.version) ?
# 								a :
# 								b
# 						,
# 						{index: \"1\", version: \"0.0.0\"}
# 					).index
# 				).reduce(
# 					(a, b) => a ? \`\${a}\\n\${b}\` : b,
# 					\"\"
# 				)
# 			);
# 		')\"
#
# 		if [ \"\${answer}\" ] ; then
# 			echo > yarn.out
# 			echo \"\${answer}\"
# 		fi
#
# 		if [ \"\$(cat yarn.out | grep -P 'Done in \d+' 2> /dev/null)\" ] ; then
# 			break
# 		fi
# 	done | bash -c '
# 		yarn add \
# 			--flat \
# 			--ignore-engines \
# 			--ignore-platform \
# 			--ignore-scripts \
# 			--non-interactive \
# 			$(echo "${modules}" | tr '\n' ' ') \
# 		|| \
# 			touch yarn.failure
# 	'
# " yarn.out
#
# if [ -f yarn.failure ] ; then
# 	fail
# fi

yarn add \
	--ignore-engines \
	--ignore-platform \
	--ignore-scripts \
	--non-interactive \
	$(echo "${modules}" | tr '\n' ' ') \
|| \
	fail

rm -rf ../node_modules ../package.json ../yarn.lock yarn.failure yarn.out 2> /dev/null


cp yarn.lock package.json ~/lib/js/

cat node_modules/tslint/package.json | grep -v tslint-test-config-non-relative > package.json.new
mv package.json.new node_modules/tslint/package.json


cd "${dir}"
rm -rf shared/lib
mv ~/lib shared/
rm -rf ~/tmplib

wget \
	https://github.com/ipfs/public-gateway-checker/raw/master/gateways.json \
	-O shared/lib/ipfs-gateways.json

./commands/getlibs.sh
cyph-prettier --write shared/lib/ipfs-gateways.json
cyph-prettier --write shared/lib/js/package.json
./commands/commit.sh --gc "${@}" updatelibs
