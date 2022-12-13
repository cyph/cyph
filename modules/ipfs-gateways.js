#!/usr/bin/env node

import {getMeta} from './base.js';
const {__dirname} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import dns from 'dns';
import memoize from 'lodash-es/memoize.js';
import maxmind from 'maxmind';
import os from 'os';
import Semaphore from 'promise-semaphore';
import {URL} from 'url';
import {promisify} from 'util';
import ipfsGatewaysJSON from './base-ipfs-gateways.json' assert {type: 'json'};
import {fetch} from './fetch.js';
import {ipfsCalculateHash} from './ipfs.js';
import {getPackageDatabase} from './package-database.js';

const {sleep} = util;

/* Blacklist of known bad or flagged gateways */
const blacklist = new Set(['https://astyanax.io/ipfs/:hash']);

const defaultGateway = 'https://gateway.ipfs.io/ipfs/:hash';

const uptimeSemaphore = new Semaphore({rooms: 2});
const uptimeCheck = memoize(async gateway =>
	uptimeSemaphore.add(async () => {
		const {
			'cyph.app': {uptime}
		} = await getPackageDatabase();

		for (const {expectedResponseSize, ipfsHash, timeout} of uptime) {
			let innerResult = false;

			for (let i = 0; !innerResult && i < 3; ++i) {
				try {
					const body = await fetch(
						gateway.replace(':hash', ipfsHash),
						{
							timeout
						},
						'arrayBuffer'
					);

					if (body.length === expectedResponseSize) {
						innerResult = true;
						continue;
					}

					await promisify(setTimeout)(1000);
				}
				catch {}
			}

			if (!innerResult) {
				return {result: false};
			}
		}

		return {result: true};
	})
);

const geoip = (async () => {
	for (const geoipPath of [
		`${__dirname}/GeoIP2-City.mmdb`,
		`${os.homedir()}/.cyph/GeoIP2-City.mmdb`
	]) {
		try {
			return await maxmind.open(geoipPath);
		}
		catch {}
	}

	return undefined;
})();

const gatewayURLs = ipfsGatewaysJSON
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

export const ipfsGateways = memoize(async skipUptimeCheck =>
	(
		await Promise.all(
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
											(await geoip)?.get(ip) ?? {
												continent: {code: 'na'}
											}
										).continent.code.toLowerCase()
									)
								)
							)
						).map(async continentCode => ({
							continentCode,
							supportsIPv6: v6IPs.length > 0,
							uptimeCheck: skipUptimeCheck ?
								undefined :
								await uptimeCheck(url),
							url
						}))
					);
				}
				catch {
					return [];
				}
			})
		)
	).reduce((a, b) => a.concat(b), [])
);

const ipfsWarmUpGateway = async ({
	gateway = defaultGateway,
	ipfsHash,
	verify = false
}) => {
	if (!ipfsHash) {
		throw new Error('IPFS hash to warm up not specified.');
	}

	const fetchContent = async () =>
		fetch(
			gateway.replace(':hash', ipfsHash),
			{
				timeout: 30000
			},
			'arrayBuffer'
		);

	if (!verify) {
		await fetchContent().catch(() => {});
		return;
	}

	while (true) {
		const content = await fetchContent().catch(err => {
			console.error(err);
		});

		const contentHash =
			content !== undefined ?
				await ipfsCalculateHash(content) :
				undefined;

		if (contentHash === ipfsHash) {
			return;
		}

		await sleep(5000);
	}
};

export const ipfsWarmUpGateways = memoize(async ipfsHashes => {
	await Promise.all(
		(
			await ipfsGateways(true)
		).map(async gateway => {
			for (const ipfsHash of ipfsHashes) {
				await ipfsWarmUpGateway({
					gateway,
					ipfsHash
				});
			}
		})
	);

	for (const ipfsHash of ipfsHashes) {
		await ipfsWarmUpGateway({
			ipfsHash,
			verify: true
		});
	}
});
