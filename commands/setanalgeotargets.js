#!/usr/bin/env node

const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const os = require('os');

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
