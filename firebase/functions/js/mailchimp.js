import mailchimpAPI from '@mailchimp/mailchimp_marketing';
import {mailchimpCredentials} from './cyph-admin-vars.js';
import {initMailchimp} from './modules/init-mailchimp.js';

const config =
	mailchimpCredentials?.apiKey && mailchimpCredentials.apiServer ?
		{
			apiKey: mailchimpCredentials.apiKey,
			server: mailchimpCredentials.apiServer
		} :
		undefined;

if (config) {
	mailchimpAPI.setConfig(config);
}

export const mailchimp = config ? mailchimpAPI : undefined;

export const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initMailchimp(mailchimp, mailchimpCredentials);
