#!/usr/bin/env ts-node


import * as cheerio from 'cheerio';
import * as childProcess from 'child_process';
import * as datauri from 'datauri';
import * as fs from 'fs';
import * as htmlencode from 'htmlencode';
import * as superSphincs from 'supersphincs';


(async () => {


const args			= {
	customBuild: process.argv[2],
	customBuildAdditionalStyling: process.argv[3],
	customBuildBackground: process.argv[4],
	customBuildFavicon: process.argv[5],
	customBuildStylesheet: process.argv[6],
	customBuildTheme: process.argv[7]
};


const compileSCSS	= scss =>
	childProcess.spawnSync('cleancss', [], {input:
		childProcess.spawnSync(
			'scss',
			['-s', '-C'],
			{input: `
				@import '/node_modules/bourbon/app/assets/stylesheets/bourbon';

				${scss}
			`}
		).stdout.toString()
	}).stdout.toString().trim()
;

const $	= cheerio.load(fs.readFileSync('../cyph.ws').toString());

const o	= JSON.parse(
	fs.readFileSync(args.customBuildTheme).toString()
);

try {
	o.background	= datauri.sync(args.customBuildBackground);
}
catch (_) {}

try {
	o.favicon		= datauri.sync(args.customBuildFavicon);
}
catch (_) {}

try {
	o.additionalStyling	= compileSCSS(
		fs.readFileSync(args.customBuildAdditionalStyling).toString()
	);
}
catch (_) {}

const css	= compileSCSS(
	eval('`' +
		fs.readFileSync(
			'../../shared/css/custom-build.scss.template'
		).
			toString().
			replace(/;/g, '!important;').
			replace(/(@include .*)\)!important;/g, '$1!important);')
	+ '`')
);

const hash	= (await superSphincs.hash(css)).hex;


if (o.title) {
	$('title').text(htmlencode.htmlEncode(o.title));
}

if (o.colors && o.colors.main) {
	$('head').find(
		'meta[name="theme-color"],' + 
		'meta[name="msapplication-TileColor"]'
	).
		attr('content', o.colors.main)
	;

	$('head').append('<style>' + compileSCSS(`
		#pre-load {
			background-color: ${o.colors.main} !important;
		}

		${!o.loadingAnimationFilter ? '' : `
			#pre-load > .transition, .loading > .logo-animation > *,
			.loading > .logo-animation.connected, md-progress-linear {
				@include filter(${o.loadingAnimationFilter});
			}
		`}
	`) + '</style>');
}

$('head').append(`<meta name='custom-build' content='${args.customBuild}' />`);

if (o.apiFlags) {
	$('head').append(`<meta name='custom-build-api-flags' content='${o.apiFlags}' />`);
}

if (o.callType) {
	$('head').append(`<meta name='custom-build-call-type' content='${o.callType}' />`);
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
