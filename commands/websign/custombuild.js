#!/usr/bin/env babel-node


import * as cheerio from 'cheerio';
import * as childProcess from 'child_process';
import * as datauri from 'datauri';
import * as fs from 'fs';
import * as htmlencode from 'htmlencode';
import * as superSphincs from 'supersphincs';


(async () => {


const args			= {
	customBuild: process.argv[0],
	customBuildAdditionalStyling: process.argv[1],
	customBuildBackground: process.argv[2],
	customBuildFavicon: process.argv[3],
	customBuildStylesheet: process.argv[4],
	customBuildTheme: process.argv[5]
};


const compileSCSS	= scss =>
	childProcess.spawnSync('cleancss', [], {input:
		childProcess.spawnSync(
			'scss',
			['-s', '-I../../shared/css'],
			{input: scss}
		).stdout.toString()
	}).stdout.toString().trim()
;

const $	= cheerio.load(fs.readFileSync('../cyph.ws').toString());

const o		= JSON.parse(
	fs.readFileSync(args.customBuildTheme).toString()
);

o.background	= datauri.sync(args.customBuildBackground);
o.favicon		= datauri.sync(args.customBuildFavicon);

try {
	o.additionalStyling	= compileSCSS(
		fs.readFileSync(args.customBuildAdditionalStyling).toString()
	);
}
catch (_) {}

const css	= compileSCSS(
	eval(`\`
		@import 'bourbon/bourbon';

		${
			fs.readFileSync(
				'../../shared/css/custom-build.scss.template'
			).toString().replace(/;/g, '!important;')
		}
	\``)
);

const hash	= (await superSphincs.hash(css)).hex;


$('title').text(htmlencode.htmlEncode(o.title));

if (o.colors.main) {
	$('head').find(
		'meta[name="theme-color"],' + 
		'meta[name="msapplication-TileColor"]'
	).
		attr('content', o.colors.main)
	;

	$('head').append(`<style>
		#pre-load {
			background-color: ${o.colors.main} !important;
		}
	</style>`);
}

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

$('head').append(`<script>
	self.customBuild		= '${args.customBuild}';
	self.customBuildFavicon	= '${o.favicon}';

	Array.prototype.slice.apply(
		document.getElementsByClassName('custom-build-favicon')
	).forEach(function (elem) {
		if (elem instanceof HTMLLinkElement) {
			elem.href		= self.customBuildFavicon;
		}
		else if (elem instanceof HTMLMetaElement) {
			elem.content	= self.customBuildFavicon;
		}
	});
</script>`);

$('body').append(`
	<link
		rel='stylesheet'
		websign-sri-path='${args.customBuildStylesheet}'
		websign-sri-hash='${hash}'
	></link>
`);

fs.writeFileSync(args.customBuildStylesheet, css);
fs.writeFileSync(args.customBuildStylesheet.srihash, hash);
fs.writeFileSync(`../${args.customBuild}`, $.html().trim());


})();
