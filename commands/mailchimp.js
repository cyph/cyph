#!/usr/bin/env node

import mailchimp from '@mailchimp/mailchimp_marketing';
import fs from 'fs';
import os from 'os';
import {initMailchimp} from '../modules/init-mailchimp.js';

const getBackendVar = k =>
	new Map(
		fs
			.readFileSync(os.homedir() + '/.cyph/backend.vars.prod')
			.toString()
			.split('\n')
			.map(s => [s.trim().split(':')[0], s.split("'")[1]])
	).get(k);

const mailchimpCredentials = {
	apiKey: getBackendVar('MAILCHIMP_API_KEY').split('-')[0],
	apiServer: getBackendVar('MAILCHIMP_API_KEY').split('-')[1],
	listIDs: {
		pendingInvites: getBackendVar('MAILCHIMP_LIST_ID_PENDING_INVITES'),
		users: getBackendVar('MAILCHIMP_LIST_ID_USERS')
	}
};

mailchimp.setConfig({
	apiKey: mailchimpCredentials.apiKey,
	server: mailchimpCredentials.apiServer
});

const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initMailchimp(mailchimp, mailchimpCredentials);

export {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
};
