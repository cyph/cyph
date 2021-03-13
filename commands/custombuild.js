#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import childProcess from 'child_process';
import datauri from 'datauri/sync';
import fs from 'fs';
import htmlencode from 'htmlencode';
import os from 'os';
import {updateRepos} from './updaterepos.js';

let hasUpdatedRepos = false;

export const repoPath = `${os.homedir()}/.cyph/repos/custom-builds`;

export const customBuildIds = fs
	.readdirSync(repoPath)
	.filter(
		s =>
			!s.startsWith('.') && fs.lstatSync(`${repoPath}/${s}`).isDirectory()
	);

const cssRoot = `${__dirname}/../shared/css`;

const compileSCSS = scss =>
	childProcess
		.spawnSync('cleancss', [], {
			input: childProcess
				.spawnSync('sass', ['--stdin', `-I${cssRoot}`], {
					input: `
						@import '~bourbon/app/assets/stylesheets/bourbon';
						${fs.readFileSync(`${cssRoot}/mixins.scss`).toString()}
						${fs.readFileSync(`${cssRoot}/theme.scss`).toString()}
						${scss}
					`
						.replace(/@import '\.\/mixins';/g, '')
						.replace(/@import '~/g, "@import '/node_modules/")
				})
				.stdout.toString()
		})
		.stdout.toString()
		.trim();

const tryReadFile = (path, jsonParse) => {
	const buffer = fs.existsSync(path) ? fs.readFileSync(path) : undefined;
	if (buffer && jsonParse) {
		return JSON.parse(buffer.toString());
	}
	return buffer;
};

export const customBuild = (id, version) => {
	if (
		!id ||
		typeof id !== 'string' ||
		id.startsWith('.') ||
		id.match(/[^a-z0-9\.\-_]/)
	) {
		throw new Error(`Invalid custom build ID: ${id}.`);
	}

	if (!hasUpdatedRepos) {
		updateRepos();
		hasUpdatedRepos = true;
	}

	const root = `${repoPath}/${id}`;

	if (!fs.existsSync(root)) {
		throw new Error(`Nonexistent custom build: ${id}.`);
	}

	const paths = {
		audioImage: `${root}/audio-image.png`,
		config: `${root}/config.json`,
		errorImage: `${root}/error-image.png`,
		favicon: `${root}/favicon.png`,
		logoHorizontal: `${root}/logo.horizontal.png`,
		logoVertical: `${root}/logo.vertical.png`,
		strings: `${root}/strings.json`,
		theme: `${root}/theme.scss`
	};

	const config = tryReadFile(paths.config, true) || {};

	const o = {
		audioImage: tryReadFile(paths.audioImage),
		config,
		errorImage: tryReadFile(paths.errorImage),
		favicon: tryReadFile(paths.favicon),
		id:
			typeof version === 'string' && version !== 'prod' && version ?
				`${version}.${id}` :
				id,
		logoHorizontal: tryReadFile(paths.logoHorizontal),
		logoVertical: tryReadFile(paths.logoVertical),
		namespace: config.useNamespace || id,
		strings: tryReadFile(paths.strings, true)
	};

	if (o.config.title) {
		o.config.title = htmlencode.htmlEncode(o.config.title);
	}

	/* Telehealth background color is copied from shared/css/themes/telehealth.scss */
	const preLoadBackgroundColor =
		o.config.backgroundColor ||
		(o.config.telehealth ? '#eeecf1' : undefined);
	const preLoadLogoPath = o.logoVertical ?
		paths.logoVertical :
	o.config.telehealth ?
		`${__dirname}/../shared/assets/img/logo.telehealth.icon.png` :
		undefined;
	const preLoadSCSS = `
		${
			!preLoadBackgroundColor ?
				'' :
				`
					html > body {
						background-color: ${preLoadBackgroundColor} !important;
					}
				`
		}
	`.trim();

	if (preLoadSCSS || preLoadLogoPath) {
		const preLoadCSS = compileSCSS(preLoadSCSS);

		o.preLoadCSS = originalCSS => {
			if (preLoadLogoPath) {
				originalCSS = originalCSS
					.replace(/body\.cordova/g, 'body')
					.replace(
						/body:not\(\.cordova\)/g,
						'body.custom-build-ignore'
					)
					.replace(
						/background-image:url\([^\)]+\)/g,
						`background-image:url(${
							datauri(preLoadLogoPath).content
						})`
					);
			}

			return preLoadCSS + originalCSS;
		};
	}

	const scss = `
		${
			!o.config.backgroundColor ?
				'' :
				`
					$cyph-background: ${o.config.backgroundColor};
				`
		}

		${
			o.config.dark === undefined ?
				'' :
				`
					$cyph-is-dark: ${o.config.dark.toString()};
				`
		}

		${
			!o.config.foregroundColor ?
				'' :
				`
					$cyph-foreground: ${o.config.foregroundColor};
				`
		}

		${(tryReadFile(paths.theme) || '').toString()}
	`.trim();

	if (scss) {
		o.css = compileSCSS(`
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

if (isCLI) {
	console.log(customBuild(process.argv[2]));
}
