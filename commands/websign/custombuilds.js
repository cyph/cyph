#!/usr/bin/env node


const cheerio						= require('cheerio');
const fs							= require('fs');
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
		const $style	= $('<style></style>');
		$style.text(o.css);
		$('head').append($style);

		o.css	= undefined;
	}

	$('head').append(`<meta name='custom-build' content='${
		potassium.toBase64(await serialize(Environment.CustomBuild, o))
	}' />`);

	fs.writeFileSync(`${args.outputPath}/${o.id}`, $.html().trim());
	outputIds.push(o.id);
}

fs.writeFileSync(`${args.outputPath}/custombuilds.list`, outputIds.join(' '));


})().catch(err => {
	console.error(err);
	process.exit(1);
});
