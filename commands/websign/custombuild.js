#!/usr/bin/env node


const cheerio			= require('cheerio');
const childProcess		= require('child_process');
const datauri			= require('datauri');
const fs				= require('fs');
const htmlencode		= require('htmlencode');
const superSphincs		= require('supersphincs');
const {potassium}		= require('../../modules/potassium');
const {StringMapProto}	= require('../../modules/proto');
const {serialize}		= require('../../modules/util');


(async () => {


const args			= {
	customBuild: process.argv[2],
	customBuildAudioImage: process.argv[3],
	customBuildBackground: process.argv[4],
	customBuildConfig: process.argv[5],
	customBuildErrorImage: process.argv[6],
	customBuildFavicon: process.argv[7],
	customBuildStrings: process.argv[8],
	customBuildStylesheet: process.argv[9],
	customBuildTheme: process.argv[10],
};


const compileSCSS	= scss =>
	childProcess.spawnSync('cleancss', [], {input:
		childProcess.spawnSync(
			'scss',
			['-s', '-C', '-I../../shared/css'],
			{input: `
				@import '~bourbon/app/assets/stylesheets/bourbon';
				${fs.readFileSync('../../shared/css/mixins.scss').toString()}
				${fs.readFileSync('../../shared/css/theme.scss').toString()}
				${scss}
			`.
				replace(/@import '\.\/mixins';/g, '').
				replace(/@import '~/g, "@import '/node_modules/")
			}
		).stdout.toString()
	}).stdout.toString().trim()
;

const $	= cheerio.load(fs.readFileSync('../cyph.ws').toString());

const o	= JSON.parse(
	fs.readFileSync(args.customBuildConfig).toString()
);

try {
	o.audioImage	= potassium.toBase64(fs.readFileSync(args.customBuildAudioImage));
}
catch (_) {}

try {
	o.background	= datauri.sync(args.customBuildBackground);
}
catch (_) {}

try {
	o.errorImage	= potassium.toBase64(fs.readFileSync(args.customBuildErrorImage));
}
catch (_) {}

try {
	o.favicon		= datauri.sync(args.customBuildFavicon);
}
catch (_) {}

try {
	o.strings		= fs.readFileSync(args.customBuildStrings).toString();
}
catch (_) {}

let css	= '';
try {
	css	= compileSCSS(`
		${!o.backgroundColor ? '' : `
			$cyph-background: ${o.backgroundColor};

			#main-chat-gradient {
				display: none !important;
			}
		`}

		${!o.foregroundColor ? '' : `
			$cyph-foreground: ${o.foregroundColor};
		`}

		${fs.readFileSync(args.customBuildTheme).toString()}

		@include cyph-apply-theme(true);

		${!o.background ? '' : `
			cyph-chat-main {
				cyph-chat-message-list:after {
					background-image: url(${o.background}) !important;
				}

				.video-call .logo {
					height: 30px !important;
					opacity: 0.4 !important;
				}
			}
		`}
	`);
}
catch (_) {}

const hash	= (await superSphincs.hash(css)).hex;


if (o.title) {
	$('title').text(htmlencode.htmlEncode(o.title));
}

let headStyle	= '';
if (o.backgroundColor) {
	$('head').find(
		'meta[name="theme-color"],' + 
		'meta[name="msapplication-TileColor"]'
	).
		attr('content', o.backgroundColor)
	;

	headStyle += `
		#pre-load {
			background-color: ${o.backgroundColor} !important;
		}
	`;
}
if (o.loadingAnimationFilter) {
	headStyle += `
		#pre-load > .transition, .loading > .logo-animation > *,
		.loading > .logo-animation.connected, md-progress-bar {
			@include filter(${o.loadingAnimationFilter});
		}
	`;
}
if (headStyle) {
	$('head').append(`<style>${compileSCSS(headStyle)}</style>`);
}

$('head').append(`<meta name='custom-build' content='${args.customBuild}' />`);

if (o.apiFlags) {
	$('head').append(`<meta name='custom-build-api-flags' content='${o.apiFlags}' />`);
}

if (o.callType) {
	$('head').append(`<meta name='custom-build-call-type' content='${o.callType}' />`);
}

if (o.audioImage) {
	$('head').append(`<meta name='custom-build-audio-image' content='${o.audioImage}' />`);
}

if (o.errorImage) {
	$('head').append(`<meta name='custom-build-error-image' content='${o.errorImage}' />`);
}

if (o.favicon) {
	$('head').find(
		'link[type="image/png"],' + 
		'meta[name="msapplication-TileImage"]'
	).
		removeAttr('websign-sri-path').
		removeAttr('websign-sri-hash').
		removeAttr('href').
		removeAttr('content').
		addClass('custom-build-favicon')
	;

	$('head').append(`<meta name='custom-build-favicon' content='${o.favicon}' />`);
}

if (o.password) {
	/* Not going to pretend that this is a security feature. */
	$('head').append(
		`<meta name='custom-build-password' content='${
			Buffer.from(o.password).toString('base64')
		}' />`
	);
}

if (o.strings) {
	$('head').append(`<meta name='custom-build-strings' content='${
		potassium.toBase64(await serialize(StringMapProto, JSON.parse(o.strings)))
	}' />`);
}

if (css) {
	$('body').append(`
		<link
			rel='stylesheet'
			websign-sri-path='${args.customBuildStylesheet}'
			websign-sri-hash='${hash}'
		></link>
	`);

	fs.writeFileSync(args.customBuildStylesheet, css);
	fs.writeFileSync(`${args.customBuildStylesheet}.srihash`, hash);
}

fs.writeFileSync(`../${args.customBuild}`, $.html().trim());


})();
