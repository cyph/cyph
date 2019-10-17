#!/usr/bin/env node

const childProcess = require('child_process');
const path = require('path');

childProcess.spawnSync(
	'node',
	[
		path.join('shared', 'node_modules', '.bin', 'cyph-pretty-quick'),
		'--staged',
		'--pattern',
		'**/*.{css,html,js,json,scss,ts,tsx}'
	],
	{cwd: path.join(__dirname, '..'), stdio: 'inherit'}
);
