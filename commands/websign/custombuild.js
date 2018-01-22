#!/usr/bin/env node


const cheerio		= require('cheerio');
const childProcess	= require('child_process');
const datauri		= require('datauri');
const fs			= require('fs');
const htmlencode	= require('htmlencode');
const superSphincs	= require('supersphincs');
const {potassium}	= require('../../modules/potassium');
const {Environment}	= require('../../modules/proto');
const {serialize}	= require('../../modules/util');


(async () => {


const args			= {
	id: process.argv[2],
	audioImage: process.argv[3],
	config: process.argv[4],
	errorImage: process.argv[5],
	favicon: process.argv[6],
	logoHorizontal: process.argv[7],
	logoVertical: process.argv[8],
	strings: process.argv[9],
	theme: process.argv[10]
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

const tryReadFile	= (path, jsonParse) => {
	const buffer	= fs.existsSync(path) ? fs.readFileSync(path) : undefined;
	if (buffer && jsonParse) {
		return JSON.parse(buffer.toString());
	}
	return buffer;
};


const $	= cheerio.load(fs.readFileSync('../cyph.ws').toString());

const customBuild	= {
	audioImage: tryReadFile(args.audioImage),
	config: tryReadFile(args.config, true) || {},
	id: args.id,
	errorImage: tryReadFile(args.errorImage),
	favicon: tryReadFile(args.favicon),
	logoHorizontal: tryReadFile(args.logoHorizontal),
	logoVertical: tryReadFile(args.logoVertical),
	strings: tryReadFile(args.strings, true)
};

if (customBuild.config.title) {
	customBuild.config.title	= htmlencode.htmlEncode(customBuild.config.title);
}


const scss	= `
	${!customBuild.config.backgroundColor ? '' : `
		$cyph-background: ${customBuild.config.backgroundColor};

		#main-chat-gradient {
			display: none !important;
		}

		#pre-load {
			background-color: ${customBuild.config.backgroundColor} !important;
		}
	`}

	${!customBuild.config.foregroundColor ? '' : `
		$cyph-foreground: ${customBuild.config.foregroundColor};
	`}

	${(tryReadFile(args.theme) || '').toString()}
`.trim();

if (scss) {
	customBuild.css	= compileSCSS(`
		${scss}
		@include cyph-apply-theme(true);
	`);
}


if (customBuild.favicon) {
	$('head').find(
		'link[type="image/png"],' + 
		'meta[name="msapplication-TileImage"]'
	).
		removeAttr('websign-sri-path').
		removeAttr('websign-sri-hash').
		removeAttr('href').
		removeAttr('content')
	;
}


$('head').append(`<meta name='custom-build' content='${
	potassium.toBase64(await serialize(Environment.CustomBuild, customBuild))
}' />`);

fs.writeFileSync(`../${args.id}`, $.html().trim());


})();
