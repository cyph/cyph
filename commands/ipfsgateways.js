#!/usr/bin/env node

const dns = require('dns');
const fs = require('fs');
const memoize = require('lodash/memoize');
const maxmind = require('maxmind');
const fetch = require('node-fetch');
const os = require('os');
const {URL} = require('url');

const ipfsGateways = memoize(async () => {
	const lookup = maxmind.open(os.homedir() + '/.cyph/GeoIP2-City.mmdb');

	const gatewayURLs = JSON.parse(
		fs
			.readFileSync(`${__dirname}/../shared/lib/ipfs-gateways.json`)
			.toString()
	).filter(s => !s.startsWith('https://:hash'));

	return (await Promise.all(
		gatewayURLs.map(async url =>
			(await fetch(
				url.replace(
					':hash',
					'QmcBBMQx8truxJZTZayMHS2sCDwzXfaRUCFyjgJKnHNrkx'
				)
			)
				.then(o => o.text())
				.catch(() => '')).trim() === 'balls' ?
				{
					continentCode: (
						(await lookup).get(
							(await dns.promises.resolve(
								new URL(url.replace(':hash.ipfs.', '')).host
							))[0]
						) || {continent: {code: 'na'}}
					).continent.code.toLowerCase(),
					url
				} :
				undefined
		)
	)).filter(s => s);
});

if (require.main === module) {
	(async () => {
		const output = JSON.stringify(await ipfsGateways());

		if (process.argv[2]) {
			fs.writeFileSync(process.argv[2], output);
		}
		else {
			console.log(output);
		}
	})();
}
else {
	module.exports = {ipfsGateways};
}
