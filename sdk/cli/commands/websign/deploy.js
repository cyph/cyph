#!/usr/bin/env node

import {program} from 'commander';
import {deploy} from '../../websign/deploy.js';

program
	.name('websign deploy')
	.option(
		'--domain <name>',
		'domain name to deploy to (defaults to the name of the application path)'
	)
	.option(
		'--mandatory-update',
		'mark this as a mandatory update (e.g. includes breaking changes)'
	)
	.option(
		'--path <application directory path>',
		'path to application (defaults to the current directory)'
	)
	.option(
		'--required-user-signatures <usernames...>',
		'require signatures from additional users before publishing'
	)
	.option(
		'--tofu-key-persistence',
		'activate TOFU public key pinning (potentially risky, so talk to us before using!)'
	)
	.option(
		'--ttl-months',
		'number of months before this release expires (defaults to 18)'
	)
	.action(
		async ({
			domain: packageName,
			mandatoryUpdate,
			path: rootDirectoryPath = process.cwd(),
			requiredUserSignatures,
			tofuKeyPersistence,
			ttlMonths
		}) =>
			deploy({
				mandatoryUpdate,
				packageName,
				requiredUserSignatures,
				rootDirectoryPath,
				tofuKeyPersistence,
				ttlMonths
			})
	)
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
