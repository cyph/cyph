#!/usr/bin/env node

const cheerio		= require('cheerio');
const datauri		= require('datauri');
const htmlencode	= require('htmlencode');
const superSphincs	= require('supersphincs');

const args			= {
	customBuild: process.argv[0],
	customBuildAdditionalStyling: process.argv[1],
	customBuildBackground: process.argv[2],
	customBuildFavicon: process.argv[3],
	customBuildStylesheet: process.argv[4],
	customBuildTheme: process.argv[5]
};

const compileSCSS	= scss =>
	child_process.spawnSync('cleancss', [], {input:
		child_process.spawnSync(
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

superSphincs.hash(css).then(hash => {
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
			websign-sri-hash='${hash.hex}'
		></link>
	`);

	fs.writeFileSync(args.customBuildStylesheet, css);
	fs.writeFileSync(args.customBuildStylesheet.srihash, hash.hex);
	fs.writeFileSync(`../${args.customBuild}`, $.html().trim());
});
