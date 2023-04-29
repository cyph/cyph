#!/usr/bin/env node

import {potassiumService as potassium, proto, util} from '@cyph/sdk';
import * as cheerio from 'cheerio';
import fastSHA512 from 'fast-sha512';
import fs from 'fs';
import {mkdirp} from 'mkdirp';
import {customBuild, customBuildIds} from '../custombuild.js';

const {Environment} = proto;
const {serialize} = util;

(async () => {
	const args = {
		packagesRoot: process.argv[2],
		inputPackageName: process.argv[3],
		version: process.argv[4]
	};

	const subresourceDir = 'custom-builds';
	const subresourceDirParent = `${args.packagesRoot}/${args.inputPackageName}`;
	const inputHTML = `${subresourceDirParent}/.index.html`;

	await mkdirp(`${subresourceDirParent}/${subresourceDir}`);

	const addSubresource = async ($, name, content) => {
		content = content.trim();

		const hash = (await fastSHA512.hash(content)).hex;
		const path = `${subresourceDir}/${name}`;

		$('head').append(
			(name.endsWith('.js') ?
				`
					<script
						websign-sri-path='${path}'
						websign-sri-hash='${hash}'
					></script>
				` :
				`
					<link
						rel='stylesheet'
						websign-sri-path='${path}'
						websign-sri-hash='${hash}'
					></link>
				`
			).trim()
		);

		fs.writeFileSync(`${subresourceDirParent}/${path}`, content);
		fs.writeFileSync(`${subresourceDirParent}/${path}.srihash`, hash);
	};

	const outputIds = [];

	for (const id of customBuildIds) {
		const $ = cheerio.load(fs.readFileSync(inputHTML).toString());
		const o = customBuild(id, args.version);
		const packageDir = `${args.packagesRoot}/${o.id}`;

		if (o.favicon) {
			$('head')
				.find(
					'link[type="image/png"],' +
						'meta[name="msapplication-TileImage"]'
				)
				.removeAttr('websign-sri-path')
				.removeAttr('websign-sri-hash')
				.removeAttr('href')
				.removeAttr('content');
		}

		if (o.preLoadCSS) {
			const $style = $('style').eq(0);
			$style.html(o.preLoadCSS($style.html()));
			delete o.preLoadCSS;
		}

		if (o.css) {
			await addSubresource($, `${o.id}.css`, o.css);
			delete o.css;
		}

		await addSubresource(
			$,
			`${o.id}.js`,
			`
				self.customBuildBase64 = '${potassium.toBase64(
					await serialize(Environment.CustomBuild, o)
				)}';
			`
		);

		await mkdirp(packageDir);
		fs.writeFileSync(`${packageDir}/.index.html`, $.html().trim());
		outputIds.push(o.id);
	}

	fs.writeFileSync(
		`${args.packagesRoot}/.custombuilds.list`,
		outputIds.join(' ')
	);

	process.exit(0);
})().catch(err => {
	console.error(err);
	process.exit(1);
});
