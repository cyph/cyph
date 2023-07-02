import mailchimpAPI from '@mailchimp/mailchimp_marketing';
import {emailMarketingCredentials} from './cyph-admin-vars.js';
import {initEmailMarketing} from './modules/init-email-marketing.js';

const config =
	emailMarketingCredentials?.apiKey && emailMarketingCredentials.apiServer ?
		{
			apiKey: emailMarketingCredentials.apiKey,
			server: emailMarketingCredentials.apiServer
		} :
		undefined;

if (config) {
	mailchimpAPI.setConfig(config);
}

const mailchimp = config ? mailchimpAPI : undefined;

export const emailMarketingEnabled = mailchimp !== undefined;

export const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initEmailMarketing(mailchimp, emailMarketingCredentials);
