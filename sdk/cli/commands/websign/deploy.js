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
		'--keep-build-artifacts',
		'keeps build artifact directory at .websign-deployment-pkg for debugging purposes'
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
	.option(
		'--unsafe-master-key <master key>',
		'Cyph master key (NOT RECOMMENDED)'
	)
	.option('--username <username>', 'Cyph username')
	.action(
		async ({
			domain: packageName,
			keepBuildArtifacts,
			mandatoryUpdate,
			path: rootDirectoryPath = process.cwd(),
			requiredUserSignatures,
			tofuKeyPersistence,
			ttlMonths,
			unsafeMasterKey: masterKey,
			username
		}) =>
			deploy({
				keepBuildArtifacts,
				mandatoryUpdate,
				masterKey,
				packageName,
				requiredUserSignatures,
				rootDirectoryPath,
				tofuKeyPersistence,
				ttlMonths,
				username
			})
	)
	.hook('postAction', () => {
		process.exit();
	});

await program.parseAsync();
