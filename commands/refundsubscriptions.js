#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import * as subscriptions from './subscriptions.js';

export const refundSubscriptions = subscriptions.refundSubscriptions;

if (isCLI) {
	(async () => {
		await refundSubscriptions(
			...process.argv.slice(2).map(s => JSON.parse(s))
		);
		console.log('done');
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
