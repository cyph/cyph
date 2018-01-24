#!/usr/bin/env node


const cheerio						= require('cheerio');
const fs							= require('fs');
const mkdirp						= require('mkdirp');
const superSphincs					= require('supersphincs');
const {potassium}					= require('../../modules/potassium');
const {Environment}					= require('../../modules/proto');
const {serialize}					= require('../../modules/util');
const {customBuild, customBuildIds}	= require('../custombuild');


(async () => {


const args			= {
	input: process.argv[2],
	outputPath: process.argv[3],
	version: process.argv[4]
};


const subresourceDir		= 'custom-builds';
const subresourceDirParent	= `${args.outputPath}/cyph.ws-subresources`;

mkdirp.sync(`${subresourceDirParent}/${subresourceDir}`);

const addSubresource	= async ($, name, content) => {
	content	= content.trim();

	const hash	= (await superSphincs.hash(content)).hex;
	const path	= `${subresourceDir}/${name}`

	$('head').append((name.endsWith('.js') ?
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
	).trim());

	fs.writeFileSync(`${subresourceDirParent}/${path}`, content);
	fs.writeFileSync(`${subresourceDirParent}/${path}.srihash`, hash);
};


const outputIds	= [];

for (const id of customBuildIds) {
	const $	= cheerio.load(fs.readFileSync(args.input).toString());
	const o	= customBuild(id, args.version);

	if (o.favicon) {
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

	if (o.css) {
		await addSubresource($, `${o.id}.css`, o.css);
		o.css	= undefined;
	}

	await addSubresource($, `${o.id}.js`, `
		self.customBuildBase64	= ${
			potassium.toBase64(await serialize(Environment.CustomBuild, o))
		};
	`);

	fs.writeFileSync(`${args.outputPath}/${o.id}`, $.html().trim());
	outputIds.push(o.id);
}

fs.writeFileSync(`${args.outputPath}/custombuilds.list`, outputIds.join(' '));


})().catch(err => {
	console.error(err);
	process.exit(1);
});
