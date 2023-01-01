#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname} = getMeta(import.meta);

import {util} from '@cyph/sdk';
import childProcess from 'child_process';
import fs from 'fs';
import minimist from 'minimist';
import {initDatabaseService} from '../modules/database-service.js';
import {updateWebSignPermissions} from '../modules/websign-permissions.js';
import {sign} from './sign.js';

const {normalizeArray} = util;

const webSignPermissionsTimestampPath = `${__dirname}/../modules/websign-permissions-timestamp.js`;

try {
	const {
		init = false,
		'package-name': packageName,
		'project-id': projectId = 'cyphme',
		remove = false,
		'user': usernameArg
	} = minimist(process.argv.slice(2));

	if (
		typeof packageName !== 'string' ||
		!packageName.includes('.') ||
		new URL(`https://${packageName}`).host !== packageName
	) {
		throw new Error(
			'Package name (--package-name <packageName>) not specified.'
		);
	}

	const testSign = projectId !== 'cyphme';

	const usernames = normalizeArray(
		usernameArg instanceof Array ? usernameArg : [usernameArg]
	).filter(s => !!s);

	if (usernames.length < 1) {
		throw new Error('No usernames (--user <username>) specified.');
	}

	const {getItem, setItem} = initDatabaseService(projectId);

	const timestamp = Date.now();

	const {newWebSignPermissions, oldWebSignPermissions} =
		await updateWebSignPermissions({
			getItem,
			init,
			projectId,
			setItem,
			sign,
			testSign,
			transform: o => ({
				packages: {
					...(o.packages ?? {}),
					[packageName]: {
						...(o.packages?.[packageName] ?? {}),
						...Object.fromEntries(
							usernames.map(username => [
								username,
								remove ?
									undefined :
									{
										timestamp
									}
							])
						)
					}
				},
				timestamp
			})
		});

	console.dir(
		{
			newWebSignPermissions,
			oldWebSignPermissions
		},
		{depth: undefined}
	);

	if (!testSign) {
		fs.writeFileSync(
			webSignPermissionsTimestampPath,
			`export const webSignPermissionsTimestamp = ${timestamp.toString()};\n`
		);

		childProcess.spawnSync(
			'git',
			[
				'commit',
				'-S',
				'-m',
				'WebSign permissions timestamp update',
				webSignPermissionsTimestampPath
			],
			{stdio: 'inherit'}
		);
	}

	console.log('WebSign permissions update complete.');
	process.exit(0);
}
catch (err) {
	console.error(err);
	console.log('WebSign permissions update failed.');
	process.exit(1);
}
