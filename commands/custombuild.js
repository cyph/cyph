#!/usr/bin/env node


const cheerio		= require('cheerio');
const childProcess	= require('child_process');
const fs			= require('fs');
const htmlencode	= require('htmlencode');
const os			= require('os');
const {updateRepos}	= require('./updaterepos');


let hasUpdatedRepos		= false;

const repoPath			= `${os.homedir()}/.cyph/repos/custom-builds`;

const customBuildIds	= fs.readdirSync(repoPath).filter(s =>
	!s.startsWith('.') &&
	fs.lstatSync(`${repoPath}/${s}`).isDirectory()
);

const cssRoot			= `${__dirname}/../shared/css`

const compileSCSS	= scss =>
	childProcess.spawnSync('cleancss', [], {input:
		childProcess.spawnSync(
			'scss',
			['-s', '-C', `-I${cssRoot}`],
			{input: `
				@import '~bourbon/app/assets/stylesheets/bourbon';
				${fs.readFileSync(`${cssRoot}/mixins.scss`).toString()}
				${fs.readFileSync(`${cssRoot}/theme.scss`).toString()}
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


const customBuild	= (id, version) => {
	if (!id || typeof id !== 'string' || id.startsWith('.') || id.match(/[^a-z0-9\.\-_]/)) {
		throw new Error(`Invalid custom build ID: ${id}.`);
	}

	if (!hasUpdatedRepos) {
		updateRepos();
		hasUpdatedRepos	= true;
	}

	const root	= `${repoPath}/${id}`;

	if (!fs.existsSync(root)) {
		throw new Error(`Nonexistent custom build: ${id}.`);
	}

	const paths	= {
		audioImage: `${root}/audio-image.png`,
		config: `${root}/config.json`,
		errorImage: `${root}/error-image.png`,
		favicon: `${root}/favicon.png`,
		logoHorizontal: `${root}/logo.horizontal.png`,
		logoVertical: `${root}/logo.vertical.png`,
		strings: `${root}/strings.json`,
		theme: `${root}/theme.scss`
	};

	const o	= {
		audioImage: tryReadFile(paths.audioImage),
		config: tryReadFile(paths.config, true) || {},
		errorImage: tryReadFile(paths.errorImage),
		favicon: tryReadFile(paths.favicon),
		id,
		logoHorizontal: tryReadFile(paths.logoHorizontal),
		logoVertical: tryReadFile(paths.logoVertical),
		strings: tryReadFile(paths.strings, true),
		version
	};

	if (o.config.title) {
		o.config.title	= htmlencode.htmlEncode(o.config.title);
	}

	const scss	= `
		${!o.config.backgroundColor ? '' : `
			$cyph-background: ${o.config.backgroundColor};

			#main-chat-gradient {
				display: none !important;
			}

			#pre-load {
				background-color: ${o.config.backgroundColor} !important;
			}
		`}

		${!o.config.foregroundColor ? '' : `
			$cyph-foreground: ${o.config.foregroundColor};
		`}

		${(tryReadFile(paths.theme) || '').toString()}
	`.trim();

	if (scss) {
		o.css	= compileSCSS(`
			${scss}

			html > body {
				&, &.modest, &.telehealth {
					@include cyph-apply-theme;
				}
			}
		`);
	}

	return o;
};


if (require.main === module) {
	console.log(customBuild(process.argv[2]));
}
else {
	module.exports	= {customBuild, customBuildIds, repoPath};
}
