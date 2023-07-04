#!/usr/bin/env node

import {Crisp} from 'crisp-api';
import fs from 'fs';
import os from 'os';
import {initEmailMarketing} from '../modules/init-email-marketing.js';

const getBackendVar = k =>
	new Map(
		fs
			.readFileSync(os.homedir() + '/.cyph/backend.vars.prod')
			.toString()
			.split('\n')
			.map(s => [s.trim().split(':')[0], s.split("'")[1]])
	).get(k);

const emailMarketingCredentials = {
	apiKey: getBackendVar('CRISP_API_KEY'),
	id: getBackendVar('CRISP_ID'),
	listIDs: {
		pendingInvites: getBackendVar('CRISP_LIST_ID_PENDING_INVITES'),
		users: getBackendVar('CRISP_LIST_ID_USERS')
	},
	websiteID: getBackendVar('CRISP_WEBSITE_ID')
};

if (
	!(
		emailMarketingCredentials.apiKey &&
		emailMarketingCredentials.id &&
		emailMarketingCredentials.websiteID
	)
) {
	throw new Error('Missing Crisp credentials.');
}

const crisp = new Crisp();

crisp.authenticateTier(
	'plugin',
	emailMarketingCredentials.id,
	emailMarketingCredentials.apiKey
);

const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initEmailMarketing(crisp, emailMarketingCredentials);

export {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
};
