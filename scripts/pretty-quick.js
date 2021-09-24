#!/usr/bin/env node

const childProcess = require('child_process');
const path = require('path');

childProcess.spawnSync(
	'node',
	[
		path.join('shared', 'node_modules', '.bin', 'cyph-pretty-quick'),
		'--staged',
		'--pattern',
		'**/*.{css,html,java,js,json,scss,ts,tsx,xml}'
	],
	{cwd: path.join(__dirname, '..'), stdio: 'inherit'}
);
