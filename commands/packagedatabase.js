#!/usr/bin/env node

import fs from 'fs';
import {packageDatabase} from '../modules/package-database.js';

const file = process.argv[2];
const output = JSON.stringify(packageDatabase());

if (file) {
	fs.writeFileSync(file, output);
}
else {
	console.log(output);
}

process.exit(0);
