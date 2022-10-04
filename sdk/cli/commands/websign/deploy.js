#!/usr/bin/env node

import {program} from 'commander';

program.arguments('<rootDirectoryPath>').action(async rootDirectoryPath => {
	console.log({rootDirectoryPath});
});

await program.parseAsync();
