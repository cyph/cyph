#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import {parse} from 'csv-parse/sync';
import fs from 'fs';
import os from 'os';

/*
	Processes geo target database into usable form.
	https://developers.google.com/analytics/devguides/collection/protocol/v1/geoid
*/

fs.writeFileSync(
	`${__dirname}/../backend/anal-geotargets.txt`,
	Object.entries(
		parse(
			fs
				.readFileSync(os.homedir() + '/.cyph/anal-geotargets.csv')
				.toString()
		)
			.slice(1)
			.reduce((o, [v, k]) => {
				o[k] = v;
				return o;
			}, {})
	)
		.map(arr => arr.join(':'))
		.join('\n')
);

process.exit(0);
