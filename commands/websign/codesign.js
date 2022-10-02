#!/usr/bin/env node

import {proto, util} from '@cyph/sdk';
import fs from 'fs';
import mkdirp from 'mkdirp';
import {sign} from '../sign.js';

const {AGSEPKICertified, PotassiumData, WebSignPackage} = proto;
const {serialize} = util;

const webSignNamespace = 'cyph.ws';

try {
	const argv = process.argv
		.slice(2)
		.filter(s => s && s !== '--mandatory-update' && s !== '--test');

	const args = {
		hashWhitelist: JSON.parse(argv[0]),
		inputs: argv.slice(1),
		mandatoryUpdate: process.argv.indexOf('--mandatory-update') > -1,
		test: process.argv.indexOf('--test') > -1
	};

	const signatureTTL = 18; // Months
	const timestamp = Date.now();

	const baseInputs = args.inputs
		.map(s => s.split('='))
		.map(([packagePath, outputDir]) => ({
			outputDir,
			webSignPackage: {
				hashWhitelist: args.hashWhitelist,
				packageData: {
					algorithm: PotassiumData.SignAlgorithms.V2Hardened,
					expirationTimestamp: timestamp + signatureTTL * 2.628e9,
					mandatoryUpdate: args.mandatoryUpdate,
					packageName: outputDir.split('/').slice(-1)[0],
					payload: fs.readFileSync(packagePath).toString().trim(),
					timestamp
				}
			}
		}));

	const inputsV1 = baseInputs.map(({webSignPackage}) => ({
		algorithm: PotassiumData.SignAlgorithms.V1,
		message: JSON.stringify({
			expires: webSignPackage.packageData.expirationTimestamp,
			hashWhitelist: webSignPackage.hashWhitelist,
			mandatoryUpdate: webSignPackage.packageData.mandatoryUpdate,
			package: webSignPackage.packageData.payload,
			packageName: webSignPackage.packageData.packageName,
			timestamp: webSignPackage.packageData.timestamp
		})
	}));

	const inputsV2 = await Promise.all(
		baseInputs.map(({webSignPackage}) =>
			async({
				additionalData: `${webSignNamespace}:webSign/packages/${webSignPackage.packageData.packageName}`,
				algorithm: PotassiumData.SignAlgorithms.V2Hardened,
				message: await serialize(WebSignPackage, webSignPackage)
			})
		)
	);

	const certifiedMessagesQueue = await sign(
		[...inputsV1, inputsV2],
		args.test
	);

	const certifiedMessagesV1 = certifiedMessagesQueue.splice(
		0,
		baseInputs.length
	);

	const certifiedMessagesV2 = certifiedMessagesQueue.splice(
		0,
		baseInputs.length
	);

	for (let i = 0; i < baseInputs.length; ++i) {
		const certifiedMessageV1 = certifiedMessagesV1[i];
		const certifiedMessageV2 = certifiedMessagesV2[i];
		const {outputDir} = baseInputs[i];

		await mkdirp(outputDir);

		fs.writeFileSync(`${outputDir}/current`, timestamp.toString());

		fs.writeFileSync(
			`${outputDir}/pkg`,
			certifiedMessageV1.data.toString('base64').replace(/\s+/g, '') +
				'\n' +
				certifiedMessageV1.publicKeys.classical.toString() +
				'\n' +
				certifiedMessageV1.publicKeys.postQuantum.toString()
		);

		fs.writeFileSync(
			`${outputDir}/pkg.v2`,
			await serialize(AGSEPKICertified, certifiedMessageV2)
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
