#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {configService as config, util} from '@cyph/sdk';
import {addInviteCode} from './addinvitecode.js';
import {backendPlans} from './backendplans.js';

const {titleize} = util;

export const giftAccount = async (projectId, checkoutURL) => {
	/* TODO: Handle other cases */
	const accountsURL =
		projectId === 'cyphme' ?
			'https://cyph.app/' :
			'https://staging.cyph.app/';

	const [categoryName, itemName] = checkoutURL
		.split('#')
		.slice(-1)[0]
		.split('/')
		.map(s => s.replace(/-([A-Za-z0-9])/g, (_, c) => c.toUpperCase()));

	const category = config.pricingConfig.categories[categoryName];
	const item = category.items[itemName];

	const accountsPlan = backendPlans()[
		`${category.id.toString()}-${item.id.toString()}`
	].accountsPlan;

	const plans = accountsPlan.startsWith('[') ?
		JSON.parse(accountsPlan) :
		[
			{
				plan: accountsPlan,
				quantity: 1,
				trialMonths: accountsPlan.startsWith('Annual') ?
					12 :
					accountsPlan.startsWith('Monthly') ?
					1 :
					undefined
			}
		];

	return Promise.all(
		plans.map(async ({plan, quantity, trialMonths}) => {
			const inviteCodes = (await addInviteCode(
				projectId,
				{'': quantity},
				undefined,
				plan,
				undefined,
				trialMonths
			))[''];

			const trialDuration =
				isNaN(trialMonths) || trialMonths < 1 ?
					undefined :
				trialMonths < 12 ?
					`${Math.floor(trialMonths)} Months`.replace(
						'1 Months',
						'1 Month'
					) :
					`${Math.floor(trialMonths / 12)} Years`.replace(
						'1 Years',
						'1 Year'
					);

			return {
				inviteCodes,
				inviteLinks: inviteCodes.map(
					inviteCode => `${accountsURL}register/${inviteCode}`
				),
				plan,
				planTitle:
					titleize(
						isNaN(trialMonths) || trialMonths < 1 ?
							plan :
							plan.replace(/^(Annual|Monthly)/, '')
					) + (trialDuration ? ` (${trialDuration})` : ''),
				trialDuration
			};
		})
	);
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const checkoutURL = process.argv[3];

		const inviteCodeGroups = await giftAccount(projectId, checkoutURL);

		console.log(inviteCodeGroups);
		console.log('\n\n\n');

		console.log(
			inviteCodeGroups
				.map(o => `${o.planTitle}\n\n${o.inviteLinks.join('\n')}`)
				.join('\n\n')
		);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
