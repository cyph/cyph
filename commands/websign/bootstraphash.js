#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {potassiumService as potassium} from '@cyph/sdk';
import {updateRepos} from '../../modules/update-repos.js';
import {bootstrapString} from './bootstrapstring.js';

export const bootstrapHash = async (withOldServiceWorker = false) =>
	potassium.toHex(
		await potassium.hash.hash(await bootstrapString(withOldServiceWorker))
	);

if (isCLI) {
	try {
		if (process.argv.includes('--only-current')) {
			console.log(await bootstrapHash());
		}
		else {
			updateRepos();
			console.log(`CURRENT HASH: ${await bootstrapHash()}`);
			console.log(`OLD SERVICEWORKER HASH: ${await bootstrapHash(true)}`);
		}

		process.exit(0);
	}
	catch (err) {
		console.error(err);
		process.exit(1);
	}
}
