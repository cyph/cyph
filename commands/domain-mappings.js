#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {configService as config} from '@cyph/sdk';

const mappings = {
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
	),
	'*': 'websign'
};

const yaml =
	'dispatch:\n' +
	Object.entries(mappings)
		.map(
			([hostname, service]) =>
				`- url: "${hostname}/*"\n  service: ${service}`
		)
		.join('\n\n');

export const domainMappings = {mappings, yaml};

if (isCLI) {
	console.log(yaml);
	process.exit(0);
}
