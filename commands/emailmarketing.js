#!/usr/bin/env node

import mailchimp from '@mailchimp/mailchimp_marketing';
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
	apiKey: getBackendVar('MAILCHIMP_API_KEY').split('-')[0],
	apiServer: getBackendVar('MAILCHIMP_API_KEY').split('-')[1],
	listIDs: {
		pendingInvites: getBackendVar('MAILCHIMP_LIST_ID_PENDING_INVITES'),
		users: getBackendVar('MAILCHIMP_LIST_ID_USERS')
	}
};

mailchimp.setConfig({
	apiKey: emailMarketingCredentials.apiKey,
	server: emailMarketingCredentials.apiServer
});

const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initEmailMarketing(mailchimp, emailMarketingCredentials);

export {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
};
