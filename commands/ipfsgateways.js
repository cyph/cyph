#!/usr/bin/env node

import fs from 'fs';
import {ipfsGateways} from '../modules/ipfs-gateways.js';

(async () => {
	const skipUptimeCheck = process.argv[2] === '--skip-uptime-check';
	const file = skipUptimeCheck ? undefined : process.argv[2];
	const output = JSON.stringify(await ipfsGateways(skipUptimeCheck));

	if (file) {
		fs.writeFileSync(file, output);
	}
	else {
		console.log(output);
	}

	process.exit(0);
})().catch(err => {
	console.error(err);
	process.exit(1);
});
