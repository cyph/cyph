#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const {getDateString} = require('../modules/util');

const warrantCanaryDatePath = `${__dirname}/../shared/js/cyph/components/warrant-canary/warrant-canary-date.ts`;

fs.writeFileSync(
	warrantCanaryDatePath,
	`/** Warrant canary date. */\nexport const warrantCanaryDate = '${getDateString()}';\n`
);

childProcess.spawnSync(
	'git',
	['commit', '-S', '-m', 'warrant canary update', warrantCanaryDatePath],
	{stdio: 'inherit'}
);
