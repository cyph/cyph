#!/usr/bin/env node

const fs = require('fs');
const os = require('os');

const getBackendVar = k =>
	new Map(
		fs
			.readFileSync(os.homedir() + '/.cyph/backend.vars.prod')
			.toString()
			.split('\n')
			.map(s => [s.trim().split(':')[0], s.split("'")[1]])
	).get(k);

const mailchimpCredentials = {
	apiKey: getBackendVar('MAILCHIMP_API_KEY'),
	listIDs: {
		pendingInvites: getBackendVar('MAILCHIMP_LIST_ID_PENDING_INVITES'),
		users: getBackendVar('MAILCHIMP_LIST_ID_USERS')
	}
};

const mailchimp = new (require('mailchimp-api-v3'))(
	mailchimpCredentials.apiKey
);

module.exports = require(`${__dirname}/../firebase/functions/mailchimp`)(
	mailchimp,
	mailchimpCredentials
);
