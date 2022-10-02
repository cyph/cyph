#!/usr/bin/env node

import {util} from '@cyph/sdk';
import fs from 'fs';
import {getPackageDatabase} from '../modules/package-database.js';

const {dynamicSerializeBytes} = util;

const file = process.argv[2];
const output = await getPackageDatabase();

if (file) {
	fs.writeFileSync(file, dynamicSerializeBytes(output));
}
else {
	console.log(JSON.stringify(output));
}

process.exit(0);
