import {Crisp} from 'crisp-api';
import {emailMarketingCredentials} from './cyph-admin-vars.js';
import {initEmailMarketing} from './modules/init-email-marketing.js';

const crisp =
	emailMarketingCredentials?.apiKey &&
	emailMarketingCredentials.id &&
	emailMarketingCredentials.websiteID ?
		new Crisp() :
		undefined;

crisp?.authenticateTier(
	'plugin',
	emailMarketingCredentials.id,
	emailMarketingCredentials.apiKey
);

export const emailMarketingEnabled = crisp !== undefined;

export const {
	addToMailingList,
	batchUpdateMailingList,
	getMailingList,
	mailingListIDs,
	mailingListMemberMetadata,
	removeFromMailingList,
	splitName
} = initEmailMarketing(crisp, emailMarketingCredentials);
