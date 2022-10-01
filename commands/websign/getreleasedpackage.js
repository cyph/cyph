#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {webSignClientService} from '@cyph/sdk';
import fs from 'fs';

export const getReleasedPackage = async (packageName = 'cyph.app') => {
	const {webSignPackage} = await webSignClientService.getPackage({
		forceLatest: true,
		packageName
	});

	return webSignPackage.packageData.payload.trim();
};

if (isCLI) {
	const packageName = process.argv[2];
	const output = process.argv[3];

	getReleasedPackage(packageName)
		.then(s => {
			if (output) {
				fs.writeFileSync(output, s);
			}
			else {
				console.log(s);
			}

			process.exit(0);
		})
		.catch(err => {
			console.error(err);
			process.exit(1);
		});
}
