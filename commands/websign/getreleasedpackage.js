#!/usr/bin/env node

import {getMeta} from '../../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import fs from 'fs';
import fetch from 'node-fetch';
import superSphincs from '/home/gibson/oldsupersphincs/node_modules/supersphincs/supersphincs.js';

const publicKeys = (() => {
	const publicKeysJS = fs
		.readFileSync(`${__dirname}/../../websign/js/keys.js`)
		.toString();

	return JSON.parse(
		publicKeysJS
			.substring(publicKeysJS.indexOf('=') + 1)
			.split(';')[0]
			.trim()
			.replace(/\/\*.*?\*\//g, '')
	);
})();

export const getReleasedPackage = async (packageName = 'cyph.app') => {
	const packageURL = `https://api.cyph.com/package/${packageName}`;

	const packageMetadata = await fetch(packageURL).then(async o => o.json());

	const packageLines = packageMetadata.package.root.trim().split('\n');

	const packageData = {
		signed: packageLines[0],
		rsaKey: publicKeys.rsa[parseInt(packageLines[1], 10)],
		sphincsKey: publicKeys.sphincs[parseInt(packageLines[2], 10)]
	};

	if (!packageData.rsaKey || !packageData.sphincsKey) {
		throw new Error('No valid public key specified.');
	}

	const {publicKey} = await superSphincs.importKeys({
		public: {
			rsa: packageData.rsaKey,
			sphincs: packageData.sphincsKey
		}
	});

	/* Temporary transitionary step */
	const opened = JSON.parse(
		await superSphincs
			.openString(packageData.signed, publicKey)
			.catch(function () {
				return superSphincs.openString(
					packageData.signed,
					publicKey,
					new Uint8Array(0)
				);
			})
	);

	/* Reject if expired or has invalid timestamp */
	if (
		Date.now() > opened.expires ||
		packageMetadata.timestamp !== opened.timestamp ||
		(packageName !== opened.packageName &&
			packageName !== opened.packageName.replace(/\.(app|ws)$/, ''))
	) {
		throw new Error('Stale or invalid data.');
	}

	return opened.package.trim();
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
