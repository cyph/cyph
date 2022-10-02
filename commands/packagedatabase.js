#!/usr/bin/env node

import fs from 'fs';
import {getPackageDatabase} from '../modules/package-database.js';

const file = process.argv[2];
const output = JSON.stringify(await getPackageDatabase());

if (file) {
	fs.writeFileSync(file, output);
}
else {
	console.log(output);
}

process.exit(0);
