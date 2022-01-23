import mailchimp from '@mailchimp/mailchimp_marketing';
import {mailchimpCredentials} from './cyph-admin-vars.js';
import {initMailchimp} from './init-mailchimp.js';

const config =
	mailchimpCredentials?.apiKey && mailchimpCredentials.apiServer ?
		{
			apiKey: mailchimpCredentials.apiKey,
			server: mailchimpCredentials.apiServer
		} :
		undefined;

if (config) {
	mailchimp.setConfig(config);
}

export const mailchimp = config ? mailchimp : undefined;

export const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initMailchimp(mailchimp, mailchimpCredentials);
