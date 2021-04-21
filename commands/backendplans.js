#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import fs from 'fs';
import memoize from 'lodash-es/memoize.js';

export const backendPlans = memoize(() => {
	const pricingConfig = JSON.parse(
		fs
			.readFileSync(`${__dirname}/../shared/js/cyph/pricing-config.json`)
			.toString()
	);

	return Object.values(pricingConfig.categories)
		.map(category =>
			Object.values(category.items).map(item => [
				`${category.id.toString()}-${item.id.toString()}`,
				{
					accountsPlan: item.accountsPlan || '',
					giftPack: item.giftPack === true,
					maxUsers: item.maxUsers || 0,
					minUsers: item.minUsers || 0,
					name: item.name || '',
					price: Math.floor((item.amount || 0) * 100),
					subscriptionType: item.subscriptionType || ''
				}
			])
		)
		.reduce((a, b) => a.concat(b), [])
		.reduce((o, [k, v]) => ({...o, [k]: v}), {});
});

if (isCLI) {
	const output = JSON.stringify(backendPlans());

	if (process.argv[2]) {
		fs.writeFileSync(process.argv[2], output);
	}
	else {
		console.log(output);
	}

	process.exit(0);
}
