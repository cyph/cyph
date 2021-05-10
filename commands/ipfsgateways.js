#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import dns from 'dns';
import fs from 'fs';
import memoize from 'lodash-es/memoize.js';
import maxmind from 'maxmind';
import os from 'os';
import {URL} from 'url';
import {fetch} from './fetch.js';
import {packageDatabase} from './packagedatabase.js';

/* Blacklist of known bad or flagged gateways */
const blacklist = new Set([
	'https://astyanax.io/ipfs/:hash',
	'https://ipfs.overpi.com/ipfs/:hash',
	'https://ipfs.telos.miami/ipfs/:hash'
]);

const timestamp = Math.floor(Date.now() / 1000);

const uptimeCheck = async gateway => {
	const {uptime} = packageDatabase()['cyph.app'];
	let result = true;

	for (const {expectedResponseSize, ipfsHash, timeout} of uptime) {
		for (let i = 0; result && i < 3; ++i) {
			const res = await fetch(gateway.replace(':hash', ipfsHash), {
				timeout
			}).catch(() => undefined);

			const body = await res?.buffer();

			if (body && body.length === expectedResponseSize) {
				break;
			}

			result = false;
		}

		if (!result) {
			break;
		}
	}

	return {result, timestamp};
};

export const ipfsGateways = memoize(async () => {
	const lookup = maxmind.open(os.homedir() + '/.cyph/GeoIP2-City.mmdb');

	const gatewayURLs = JSON.parse(
		fs
			.readFileSync(`${__dirname}/../shared/lib/ipfs-gateways.json`)
			.toString()
	)
		.filter(
			s =>
				s.startsWith('https://') &&
				!s.startsWith('https://:hash') &&
				!blacklist.has(s)
		)
		.map(url => ({
			host: new URL(url.replace(':hash.ipfs.', '')).host,
			url
		}));

	return (await Promise.all(
		gatewayURLs.map(async ({host, url}) => {
			try {
				const [v4IPs, v6IPs] = await Promise.all([
					dns.promises.resolve(host).catch(() => []),
					dns.promises.resolve6(host).catch(() => [])
				]);

				return Promise.all(
					Array.from(
						new Set(
							await Promise.all(
								[...v4IPs, ...v6IPs].map(async ip =>
									(
										(await lookup).get(ip) || {
											continent: {code: 'na'}
										}
									).continent.code.toLowerCase()
								)
							)
						)
					).map(async continentCode => ({
						continentCode,
						supportsIPv6: v6IPs.length > 0,
						uptimeCheck: await uptimeCheck(url),
						url
					}))
				);
			}
			catch {
				return [];
			}
		})
	)).reduce((a, b) => a.concat(b), []);
});

if (isCLI) {
	(async () => {
		const output = JSON.stringify(await ipfsGateways());

		if (process.argv[2]) {
			fs.writeFileSync(process.argv[2], output);
		}
		else {
			console.log(output);
		}

		process.exit(0);
	})();
}
