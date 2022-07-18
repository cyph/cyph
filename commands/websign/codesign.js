#!/usr/bin/env node

import {proto} from '@cyph/sdk';
import fs from 'fs';
import mkdirp from 'mkdirp';
import {sign} from '../sign.js';

const {PotassiumData} = proto;

try {
	const argv = process.argv.slice(2).filter(s => s && s !== '--test');

	const args = {
		hashWhitelist: JSON.parse(argv[0]),
		inputs: argv.slice(1),
		test: process.argv.indexOf('--test') > -1
	};

	const signatureTTL = 18; // Months
	const timestamp = Date.now();

	const inputs = args.inputs
		.map(s => s.split('='))
		.map(arr => ({
			message: JSON.stringify({
				timestamp,
				expires: timestamp + signatureTTL * 2.628e9,
				hashWhitelist: args.hashWhitelist,
				package: fs.readFileSync(arr[0]).toString().trim(),
				packageName: arr[1].split('/').slice(-1)[0]
			}),
			outputDir: arr[1]
		}));

	/* TODO: Update this */
	const algorithm = PotassiumData.SignAlgorithms.V1;

	const certifiedMessages = await sign(
		inputs.map(({message}) => ({algorithm, message})),
		args.test
	);

	for (let i = 0; i < inputs.length; ++i) {
		const certified = certifiedMessages[i];
		const outputDir = inputs[i].outputDir;

		await mkdirp(outputDir);

		fs.writeFileSync(`${outputDir}/current`, timestamp.toString());

		fs.writeFileSync(
			`${outputDir}/pkg`,
			certified.data.toString('base64').replace(/\s+/g, '') +
				'\n' +
				certified.publicKeys.classical.toString() +
				'\n' +
				certified.publicKeys.postQuantum.toString()
		);

		console.log(`${outputDir} saved.`);
	}

	console.log('Code signing complete.');
	process.exit(0);
}
catch (err) {
	console.error(err);
	console.log('Code signing failed.');
	process.exit(1);
}
