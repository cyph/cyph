#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {configService as config, util} from '@cyph/sdk';
import fs from 'fs/promises';
import path from 'path';
import {getCDNRepo} from '../modules/cdn-repo.js';

const {filterUndefined} = util;

const defaultMappings = {
	'api.cyph.com': 'default',
	'cyph.com': 'nakedredirect',
	'www.cyph.com': 'cyph-com',
	...Object.fromEntries(
		Object.keys(config.webSignRedirects)
			.map(hostname => ({
				hostname,
				service: hostname.replace(/\./g, '-')
			}))
			.flatMap(({hostname, service}) => [
				[hostname, service],
				[`www.${hostname}`, service]
			])
	)
};

const defaultService = 'websign';

export const domainMappings = async () => {
	const cdnRepo = await getCDNRepo();

	const mappings = {
		...defaultMappings,
		...Object.fromEntries(
			filterUndefined(
				await Promise.all(
					(
						await fs.readdir(cdnRepo.repoPath)
					).map(async dir =>
						dir !== '.git' &&
						dir !== 'app' &&
						dir !== 'cyph' &&
						dir !== 'websign' &&
						!dir.startsWith('simple-') &&
						!(
							await fs.lstat(path.join(cdnRepo.repoPath, dir))
						).isSymbolicLink() ?
							dir :
							undefined
					)
				)
			).flatMap(dir => [
				[dir, defaultService],
				[`www.${dir}`, defaultService]
			])
		)
	};

	const yaml =
		'dispatch:\n' +
		Object.entries(mappings)
			.map(
				([hostname, service]) =>
					`- url: "${hostname}/*"\n  service: ${service}`
			)
			.join('\n\n');

	return {mappings, yaml};
};

if (isCLI) {
	domainMappings()
		.then(({yaml}) => {
			console.log(yaml);
			process.exit(0);
		})
		.catch(err => {
			console.error(err);
			process.exit(1);
		});
}
