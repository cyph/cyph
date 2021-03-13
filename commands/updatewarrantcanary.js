#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import childProcess from 'child_process';
import fs from 'fs';
import {getDateString} from '../modules/util.js';

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
